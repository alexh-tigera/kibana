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

const readinessDetectionHealthSchema = z.object({
  timeRange: z
    .string()
    .optional()
    .describe('Time range for evaluating detection health (default: 24h). Example: 24h, 7d'),
  ruleIds: z
    .array(z.string())
    .optional()
    .describe('Specific rule IDs to check. If omitted, checks all enabled rules.'),
  includeAlertVolume: z
    .boolean()
    .optional()
    .describe('Include alert volume analysis per rule (default: true)'),
  includeSuppression: z
    .boolean()
    .optional()
    .describe('Include alert suppression analysis (default: true)'),
});

export const READINESS_DETECTION_HEALTH_TOOL_ID = securityTool('readiness_detection_health');

export const readinessDetectionHealthTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof readinessDetectionHealthSchema> => {
  return {
    id: READINESS_DETECTION_HEALTH_TOOL_ID,
    type: ToolType.builtin,
    description: `Assess detection rule execution health for SIEM readiness. Identifies rules with execution failures, slow execution times (P95 duration), and silent rules (enabled but producing no alerts). Returns execution success rate, failure details, and recommendations for improving detection reliability.`,
    schema: readinessDetectionHealthSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      {
        timeRange = '24h',
        ruleIds,
        includeAlertVolume = true,
        includeSuppression = true,
      },
      { esClient, spaceId }
    ) => {
      logger.debug(
        `${READINESS_DETECTION_HEALTH_TOOL_ID} called with timeRange: ${timeRange}`
      );

      try {
        const ruleFilter = ruleIds?.length
          ? `| WHERE kibana.saved_objects.id IN (${ruleIds.map((id) => `"${id}"`).join(', ')})`
          : '';

        const executionFailuresQuery = `FROM .kibana-event-log-*
| WHERE event.provider == "alerting" AND event.action == "execute" AND @timestamp >= NOW() - ${timeRange}
${ruleFilter}
| STATS total_executions = COUNT(*), failures = COUNT_VALUES(CASE(event.outcome == "failure", "fail", NULL)) BY kibana.saved_objects.id
| LIMIT 200`;

        const executionDurationQuery = `FROM .kibana-event-log-*
| WHERE event.provider == "alerting" AND event.action == "execute" AND event.outcome == "success" AND @timestamp >= NOW() - ${timeRange}
${ruleFilter}
| STATS p95_duration_ms = PERCENTILE(event.duration, 95), avg_duration_ms = PERCENTILE(event.duration, 50) BY kibana.saved_objects.id
| WHERE p95_duration_ms > 30000000000
| SORT p95_duration_ms DESC
| LIMIT 50`;

        const silentRulesQuery = `FROM .alerts-security.alerts-${spaceId}
| WHERE @timestamp >= NOW() - 7d
| STATS recent_alerts = COUNT(*) BY kibana.alert.rule.uuid
| LIMIT 500`;

        const baselineSilentQuery = `FROM .alerts-security.alerts-${spaceId}
| WHERE @timestamp >= NOW() - 30d AND @timestamp < NOW() - 7d
| STATS baseline_alerts = COUNT(*) BY kibana.alert.rule.uuid
| LIMIT 500`;

        const [failuresResult, durationResult, silentResult, baselineResult] =
          await Promise.all([
            esClient.asCurrentUser.transport.request<{
              columns: Array<{ name: string; type: string }>;
              values: unknown[][];
            }>({ method: 'POST', path: '/_query', body: { query: executionFailuresQuery } }),
            esClient.asCurrentUser.transport.request<{
              columns: Array<{ name: string; type: string }>;
              values: unknown[][];
            }>({ method: 'POST', path: '/_query', body: { query: executionDurationQuery } }),
            esClient.asCurrentUser.transport.request<{
              columns: Array<{ name: string; type: string }>;
              values: unknown[][];
            }>({ method: 'POST', path: '/_query', body: { query: silentRulesQuery } }),
            esClient.asCurrentUser.transport.request<{
              columns: Array<{ name: string; type: string }>;
              values: unknown[][];
            }>({ method: 'POST', path: '/_query', body: { query: baselineSilentQuery } }),
          ]);

        const executionFailures: Array<{
          rule_id: string;
          total_executions: number;
          failure_count: number;
        }> = [];
        let totalExecutions = 0;
        let totalFailures = 0;

        for (const row of failuresResult.values ?? []) {
          const execCount = row[0] as number;
          const failValues = row[1] as string[] | null;
          const failCount = failValues?.length ?? 0;
          const ruleId = row[2] as string;

          totalExecutions += execCount;
          totalFailures += failCount;

          if (failCount > 0) {
            executionFailures.push({
              rule_id: ruleId,
              total_executions: execCount,
              failure_count: failCount,
            });
          }
        }

        const slowRules: Array<{
          rule_id: string;
          p95_duration_ms: number;
          avg_duration_ms: number;
        }> = [];
        for (const row of durationResult.values ?? []) {
          slowRules.push({
            rule_id: row[2] as string,
            p95_duration_ms: Math.round((row[0] as number) / 1_000_000),
            avg_duration_ms: Math.round((row[1] as number) / 1_000_000),
          });
        }

        const recentAlerts = new Map<string, number>();
        for (const row of silentResult.values ?? []) {
          recentAlerts.set(row[1] as string, row[0] as number);
        }

        const baselineAlerts = new Map<string, number>();
        for (const row of baselineResult.values ?? []) {
          baselineAlerts.set(row[1] as string, row[0] as number);
        }

        const silentRules: Array<{
          rule_id: string;
          baseline_alerts_30d: number;
          recent_alerts_7d: number;
        }> = [];
        for (const [ruleId, baseline] of baselineAlerts) {
          const recent = recentAlerts.get(ruleId) ?? 0;
          if (recent === 0 && baseline > 0) {
            silentRules.push({
              rule_id: ruleId,
              baseline_alerts_30d: baseline,
              recent_alerts_7d: 0,
            });
          }
        }

        const executionSuccessPct =
          totalExecutions > 0
            ? Math.round(((totalExecutions - totalFailures) / totalExecutions) * 100)
            : 100;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                summary: {
                  execution_success_pct: executionSuccessPct,
                  total_executions: totalExecutions,
                  total_failures: totalFailures,
                  slow_rules_count: slowRules.length,
                  silent_rules_count: silentRules.length,
                  time_range: timeRange,
                },
                execution_failures: executionFailures,
                slow_rules: slowRules,
                silent_rules: silentRules,
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${READINESS_DETECTION_HEALTH_TOOL_ID}: ${message}`);
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
    tags: ['security', 'readiness', 'detection-health', 'rule-execution'],
  };
};
