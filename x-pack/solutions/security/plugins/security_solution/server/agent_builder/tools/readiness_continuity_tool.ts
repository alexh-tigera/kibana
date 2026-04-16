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

const readinessContinuitySchema = z.object({
  dataStreams: z
    .array(z.string())
    .optional()
    .describe(
      'Specific data streams to check. If omitted, checks all data streams matching logs-* and metrics-*'
    ),
  timeRange: z
    .string()
    .optional()
    .describe('Current window to evaluate volume (default: 24h). Example: 24h, 12h, 6h'),
  baselineWindow: z
    .string()
    .optional()
    .describe(
      'Baseline window for computing daily average volume (default: 7d). Example: 7d, 14d, 30d'
    ),
  latencyThresholdMinutes: z
    .number()
    .optional()
    .describe(
      'P95 ingestion latency threshold in minutes above which a stream is flagged (default: 15)'
    ),
});

export const READINESS_CONTINUITY_TOOL_ID = securityTool('readiness_continuity');

export const readinessContinuityTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof readinessContinuitySchema> => {
  return {
    id: READINESS_CONTINUITY_TOOL_ID,
    type: ToolType.builtin,
    description: `Assess data ingestion continuity and health for SIEM readiness. Detects silent streams (no data when baseline exists), volume drops (>50% below baseline), and high ingestion latency. Returns per-stream findings with severity and recommended actions.`,
    schema: readinessContinuitySchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      {
        dataStreams,
        timeRange = '24h',
        baselineWindow = '7d',
        latencyThresholdMinutes = 15,
      },
      { esClient }
    ) => {
      logger.debug(
        `${READINESS_CONTINUITY_TOOL_ID} called with timeRange: ${timeRange}, baselineWindow: ${baselineWindow}`
      );

      try {
        const streamFilter = dataStreams?.length
          ? `| WHERE data_stream.dataset IN (${dataStreams.map((d) => `"${d}"`).join(', ')})`
          : '';

        const currentVolumeQuery = `FROM logs-*,metrics-*
| WHERE @timestamp >= NOW() - ${timeRange}
${streamFilter}
| STATS current_count = COUNT(*) BY data_stream.dataset
| LIMIT 500`;

        const baselineVolumeQuery = `FROM logs-*,metrics-*
| WHERE @timestamp >= NOW() - ${baselineWindow} AND @timestamp < NOW() - ${timeRange}
${streamFilter}
| STATS baseline_total = COUNT(*) BY data_stream.dataset
| LIMIT 500`;

        const latencyQuery = `FROM logs-*,metrics-*
| WHERE @timestamp >= NOW() - ${timeRange} AND event.ingested IS NOT NULL
${streamFilter}
| EVAL latency_minutes = DATE_DIFF("minutes", @timestamp, event.ingested)
| STATS p50_latency = PERCENTILE(latency_minutes, 50), p95_latency = PERCENTILE(latency_minutes, 95) BY data_stream.dataset
| LIMIT 500`;

        const [currentResult, baselineResult, latencyResult] = await Promise.all([
          esClient.asCurrentUser.transport.request<{
            columns: Array<{ name: string; type: string }>;
            values: unknown[][];
          }>({ method: 'POST', path: '/_query', body: { query: currentVolumeQuery } }),
          esClient.asCurrentUser.transport.request<{
            columns: Array<{ name: string; type: string }>;
            values: unknown[][];
          }>({ method: 'POST', path: '/_query', body: { query: baselineVolumeQuery } }),
          esClient.asCurrentUser.transport.request<{
            columns: Array<{ name: string; type: string }>;
            values: unknown[][];
          }>({ method: 'POST', path: '/_query', body: { query: latencyQuery } }),
        ]);

        const currentVolume = new Map<string, number>();
        for (const row of currentResult.values ?? []) {
          currentVolume.set(row[1] as string, row[0] as number);
        }

        const baselineDays = parseInt(baselineWindow, 10) || 7;
        const currentDays = parseInt(timeRange, 10) || 1;
        const baselineVolume = new Map<string, number>();
        for (const row of baselineResult.values ?? []) {
          const dataset = row[1] as string;
          const total = row[0] as number;
          const effectiveBaselineDays = baselineDays - currentDays;
          baselineVolume.set(dataset, effectiveBaselineDays > 0 ? total / effectiveBaselineDays : total);
        }

        const latencyByDataset = new Map<string, { p50: number; p95: number }>();
        for (const row of latencyResult.values ?? []) {
          latencyByDataset.set(row[2] as string, {
            p50: row[0] as number,
            p95: row[1] as number,
          });
        }

        const allDatasets = new Set([...currentVolume.keys(), ...baselineVolume.keys()]);
        const findings: Array<{
          dataset: string;
          issue: string;
          severity: string;
          current_count: number;
          baseline_daily_avg: number;
          details: string;
        }> = [];
        const silentStreams: string[] = [];
        const volumeDrops: string[] = [];
        const highLatencyStreams: string[] = [];

        for (const dataset of allDatasets) {
          const current = currentVolume.get(dataset) ?? 0;
          const baseline = baselineVolume.get(dataset) ?? 0;

          if (current === 0 && baseline > 0) {
            silentStreams.push(dataset);
            findings.push({
              dataset,
              issue: 'silent',
              severity: 'critical',
              current_count: 0,
              baseline_daily_avg: baseline,
              details: `No data received in the last ${timeRange} but baseline daily average is ${Math.round(baseline)} events`,
            });
          } else if (baseline > 0 && current < baseline * 0.5) {
            volumeDrops.push(dataset);
            findings.push({
              dataset,
              issue: 'volume_drop',
              severity: 'high',
              current_count: current,
              baseline_daily_avg: baseline,
              details: `Volume dropped to ${Math.round((current / baseline) * 100)}% of baseline`,
            });
          }
        }

        for (const [dataset, latency] of latencyByDataset) {
          if (latency.p95 > latencyThresholdMinutes) {
            highLatencyStreams.push(dataset);
            findings.push({
              dataset,
              issue: 'high_latency',
              severity: latency.p95 > latencyThresholdMinutes * 2 ? 'high' : 'medium',
              current_count: currentVolume.get(dataset) ?? 0,
              baseline_daily_avg: baselineVolume.get(dataset) ?? 0,
              details: `P95 ingestion latency is ${Math.round(latency.p95)} minutes (threshold: ${latencyThresholdMinutes})`,
            });
          }
        }

        const overallStatus =
          silentStreams.length > 0
            ? 'critical'
            : volumeDrops.length > 0 || highLatencyStreams.length > 0
              ? 'degraded'
              : 'healthy';

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                summary: {
                  overall_status: overallStatus,
                  total_streams_checked: allDatasets.size,
                  silent_streams_count: silentStreams.length,
                  volume_drops_count: volumeDrops.length,
                  high_latency_streams_count: highLatencyStreams.length,
                  time_range: timeRange,
                  baseline_window: baselineWindow,
                },
                silent_streams: silentStreams,
                volume_drops: volumeDrops,
                high_latency_streams: highLatencyStreams,
                findings,
                latency_by_tier: Object.fromEntries(latencyByDataset),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${READINESS_CONTINUITY_TOOL_ID}: ${message}`);
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
    tags: ['security', 'readiness', 'continuity', 'ingestion-health'],
  };
};
