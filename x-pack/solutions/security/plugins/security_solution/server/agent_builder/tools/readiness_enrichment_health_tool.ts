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

const readinessEnrichmentHealthSchema = z.object({
  checkTI: z
    .boolean()
    .optional()
    .describe('Check threat intelligence feed freshness (default: true)'),
  checkTransforms: z
    .boolean()
    .optional()
    .describe('Check transform health status (default: true)'),
  checkEnrichPolicies: z
    .boolean()
    .optional()
    .describe('Check enrich policy execution stats (default: true)'),
  tiFreshnessHours: z
    .number()
    .optional()
    .describe(
      'Hours after which a TI feed is considered stale (default: 48). Feeds with no data newer than this are flagged.'
    ),
});

export const READINESS_ENRICHMENT_HEALTH_TOOL_ID = securityTool('readiness_enrichment_health');

export const readinessEnrichmentHealthTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof readinessEnrichmentHealthSchema> => {
  return {
    id: READINESS_ENRICHMENT_HEALTH_TOOL_ID,
    type: ToolType.builtin,
    description: `Assess the health of enrichment pipelines that support SIEM detections. Checks threat intelligence feed freshness (stale TI feeds degrade indicator-match rules), transform health (failed transforms break entity analytics and risk scoring), and enrich policy execution stats. Returns per-component status with recommended remediation.`,
    schema: readinessEnrichmentHealthSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      {
        checkTI = true,
        checkTransforms = true,
        checkEnrichPolicies = true,
        tiFreshnessHours = 48,
      },
      { esClient }
    ) => {
      logger.debug(
        `${READINESS_ENRICHMENT_HEALTH_TOOL_ID} called with checkTI: ${checkTI}, checkTransforms: ${checkTransforms}, checkEnrichPolicies: ${checkEnrichPolicies}`
      );

      try {
        const tiFeeds: Array<{
          dataset: string;
          doc_count: number;
          last_updated: string;
          hours_stale: number;
          status: string;
        }> = [];
        const transforms: Array<{
          id: string;
          state: string;
          health_status: string;
          documents_processed: number;
          last_checkpoint_ms: number;
          reason?: string;
        }> = [];
        let enrichStats: {
          total_policies: number;
          executing_policies: number;
          coordinator_stats: unknown;
        } | null = null;

        if (checkTI) {
          const tiFreshnessQuery = `FROM logs-ti_*-*
| STATS last_updated = MAX(@timestamp), doc_count = COUNT(*) BY data_stream.dataset
| LIMIT 100`;

          const tiResult = await esClient.asCurrentUser.transport.request<{
            columns: Array<{ name: string; type: string }>;
            values: unknown[][];
          }>({ method: 'POST', path: '/_query', body: { query: tiFreshnessQuery } });

          const now = Date.now();
          for (const row of tiResult.values ?? []) {
            const lastUpdated = row[0] as string;
            const docCount = row[1] as number;
            const dataset = row[2] as string;
            const lastUpdatedMs = new Date(lastUpdated).getTime();
            const hoursStale = Math.round((now - lastUpdatedMs) / (1000 * 60 * 60));

            tiFeeds.push({
              dataset,
              doc_count: docCount,
              last_updated: lastUpdated,
              hours_stale: hoursStale,
              status: hoursStale > tiFreshnessHours ? 'stale' : 'fresh',
            });
          }
        }

        if (checkTransforms) {
          const transformStats = await esClient.asCurrentUser.transform.getTransformStats({
            transform_id: '_all',
          });

          for (const t of transformStats.transforms) {
            transforms.push({
              id: t.id,
              state: t.state,
              health_status: t.health?.status ?? 'unknown',
              documents_processed: t.stats.documents_processed ?? 0,
              last_checkpoint_ms: t.checkpointing?.last?.timestamp_millis ?? 0,
              ...(t.health?.status !== 'green' && t.reason ? { reason: t.reason } : {}),
            });
          }
        }

        if (checkEnrichPolicies) {
          const enrichResult = await esClient.asCurrentUser.enrich.stats();
          enrichStats = {
            total_policies: enrichResult.executing_policies?.length ?? 0,
            executing_policies: enrichResult.executing_policies?.length ?? 0,
            coordinator_stats: enrichResult.coordinator_stats ?? [],
          };
        }

        const staleTiCount = tiFeeds.filter((f) => f.status === 'stale').length;
        const unhealthyTransforms = transforms.filter(
          (t) => t.state !== 'started' || t.health_status !== 'green'
        );

        let overallStatus = 'healthy';
        if (staleTiCount > 0 || unhealthyTransforms.length > 0) {
          overallStatus = 'degraded';
        }
        if (
          unhealthyTransforms.length > transforms.length / 2 ||
          staleTiCount > tiFeeds.length / 2
        ) {
          overallStatus = 'critical';
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                summary: {
                  overall_status: overallStatus,
                  ti_feeds_total: tiFeeds.length,
                  ti_feeds_stale: staleTiCount,
                  ti_freshness_threshold_hours: tiFreshnessHours,
                  transforms_total: transforms.length,
                  transforms_unhealthy: unhealthyTransforms.length,
                },
                ti_feeds: tiFeeds,
                transforms: transforms.slice(0, 50),
                enrich_stats: enrichStats,
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${READINESS_ENRICHMENT_HEALTH_TOOL_ID}: ${message}`);
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
    tags: ['security', 'readiness', 'enrichment', 'threat-intelligence', 'transforms'],
  };
};
