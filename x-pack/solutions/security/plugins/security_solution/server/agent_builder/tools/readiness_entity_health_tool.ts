/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

const readinessEntityHealthSchema = z.object({
  space: z
    .string()
    .optional()
    .describe('Kibana space ID (default: "default")'),
  includeResourcePressure: z
    .boolean()
    .optional()
    .describe(
      'Include cluster health and JVM memory pressure metrics (default: true). Useful for diagnosing transform failures due to resource constraints.'
    ),
});

export const READINESS_ENTITY_HEALTH_TOOL_ID = securityTool('readiness_entity_health');

export const readinessEntityHealthTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof readinessEntityHealthSchema> => {
  return {
    id: READINESS_ENTITY_HEALTH_TOOL_ID,
    type: ToolType.builtin,
    description: `Assess Entity Analytics health for SIEM readiness. Checks risk scoring transforms, entity counts, asset criticality assignments, and alert-to-entity match rates. Optionally includes cluster resource pressure (JVM heap, cluster health) to diagnose transform failures. Returns entity analytics operational status with remediation guidance.`,
    schema: readinessEntityHealthSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ space = 'default', includeResourcePressure = true }, { esClient }) => {
      logger.debug(
        `${READINESS_ENTITY_HEALTH_TOOL_ID} called with space: ${space}, includeResourcePressure: ${includeResourcePressure}`
      );

      try {
        const riskScoreIndex = `risk-score.risk-score-latest-${space}`;
        let riskScoreSummary: {
          total_entities: number;
          hosts: number;
          users: number;
          last_scored: string | null;
        } = { total_entities: 0, hosts: 0, users: 0, last_scored: null };

        try {
          const riskQuery = `FROM ${riskScoreIndex}
| STATS total = COUNT(*), last_scored = MAX(@timestamp), hosts = COUNT_VALUES(CASE(host.name IS NOT NULL, host.name, NULL)), users = COUNT_VALUES(CASE(user.name IS NOT NULL, user.name, NULL))
| LIMIT 1`;

          const riskResult = await esClient.asCurrentUser.transport.request<{
            columns: Array<{ name: string; type: string }>;
            values: unknown[][];
          }>({ method: 'POST', path: '/_query', body: { query: riskQuery } });

          if (riskResult.values?.length) {
            const row = riskResult.values[0];
            riskScoreSummary = {
              total_entities: row[0] as number,
              last_scored: row[1] as string | null,
              hosts: (row[2] as string[] | null)?.length ?? 0,
              users: (row[3] as string[] | null)?.length ?? 0,
            };
          }
        } catch {
          logger.debug('Risk score index not available, skipping');
        }

        const riskTransformStats = await esClient.asCurrentUser.transform.getTransformStats({
          transform_id: 'entity-risk-score-*',
          allow_no_match: true,
        });

        const riskTransforms = riskTransformStats.transforms.map((t) => ({
          id: t.id,
          state: t.state,
          health_status: t.health?.status ?? 'unknown',
          documents_processed: t.stats.documents_processed ?? 0,
          last_checkpoint_ms: t.checkpointing?.last?.timestamp_millis ?? 0,
        }));

        let assetCriticalityCount = 0;
        try {
          const criticalityQuery = `FROM .asset-criticality.asset-criticality-${space}
| STATS total = COUNT(*)
| LIMIT 1`;

          const critResult = await esClient.asCurrentUser.transport.request<{
            columns: Array<{ name: string; type: string }>;
            values: unknown[][];
          }>({ method: 'POST', path: '/_query', body: { query: criticalityQuery } });

          if (critResult.values?.length) {
            assetCriticalityCount = critResult.values[0][0] as number;
          }
        } catch {
          logger.debug('Asset criticality index not available, skipping');
        }

        let alertEntityMatchRate: number | null = null;
        try {
          const alertMatchQuery = `FROM .alerts-security.alerts-${space}
| WHERE @timestamp >= NOW() - 7d
| STATS total_alerts = COUNT(*), with_entity = COUNT(CASE(host.name IS NOT NULL OR user.name IS NOT NULL, 1, NULL))
| LIMIT 1`;

          const alertResult = await esClient.asCurrentUser.transport.request<{
            columns: Array<{ name: string; type: string }>;
            values: unknown[][];
          }>({ method: 'POST', path: '/_query', body: { query: alertMatchQuery } });

          if (alertResult.values?.length) {
            const totalAlerts = alertResult.values[0][0] as number;
            const withEntity = alertResult.values[0][1] as number;
            alertEntityMatchRate =
              totalAlerts > 0 ? Math.round((withEntity / totalAlerts) * 100) : null;
          }
        } catch {
          logger.debug('Alert index not available for match rate calculation');
        }

        let resourcePressure: {
          cluster_status: string;
          nodes: Array<{
            name: string;
            jvm_heap_used_pct: number;
            jvm_heap_max_bytes: number;
          }>;
        } | null = null;

        if (includeResourcePressure) {
          const clusterHealth = await esClient.asCurrentUser.cluster.health();
          const nodeStats = await esClient.asCurrentUser.nodes.stats({ metric: ['jvm'] });

          const nodes = Object.entries(nodeStats.nodes).map(([, node]) => ({
            name: node.name,
            jvm_heap_used_pct: node.jvm?.mem?.heap_used_percent ?? 0,
            jvm_heap_max_bytes: node.jvm?.mem?.heap_max_in_bytes ?? 0,
          }));

          resourcePressure = {
            cluster_status: clusterHealth.status,
            nodes,
          };
        }

        const unhealthyTransforms = riskTransforms.filter(
          (t) => t.state !== 'started' || t.health_status !== 'green'
        );

        let overallStatus = 'healthy';
        if (unhealthyTransforms.length > 0 || riskScoreSummary.total_entities === 0) {
          overallStatus = 'degraded';
        }
        if (riskTransforms.length === 0) {
          overallStatus = 'not_configured';
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                summary: {
                  overall_status: overallStatus,
                  space,
                  risk_score_entities: riskScoreSummary.total_entities,
                  risk_score_hosts: riskScoreSummary.hosts,
                  risk_score_users: riskScoreSummary.users,
                  last_scored: riskScoreSummary.last_scored,
                  asset_criticality_assignments: assetCriticalityCount,
                  alert_entity_match_rate_pct: alertEntityMatchRate,
                  risk_transforms_total: riskTransforms.length,
                  risk_transforms_unhealthy: unhealthyTransforms.length,
                },
                risk_transforms: riskTransforms,
                resource_pressure: resourcePressure,
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${READINESS_ENTITY_HEALTH_TOOL_ID}: ${message}`);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { status: 'UNKNOWN', error: message },
            },
          ],
        };
      }
    },
    tags: ['security', 'readiness', 'entity-health', 'risk-scoring', 'entity-analytics'],
  };
};
