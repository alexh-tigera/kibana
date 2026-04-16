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

const readinessImpactGraphSchema = z.object({
  mode: z
    .enum(['full_graph', 'trace_stream', 'trace_field'])
    .describe(
      'Mode of operation: full_graph builds the complete data-to-detection graph, trace_stream traces a specific data stream to its detection rules, trace_field traces a specific field to rules that reference it'
    ),
  dataStream: z
    .string()
    .optional()
    .describe('Data stream name to trace (required for trace_stream mode)'),
  field: z
    .string()
    .optional()
    .describe('Field name to trace across rule queries (required for trace_field mode)'),
  indexPattern: z
    .string()
    .optional()
    .describe('Index pattern to scope the graph (default: logs-*, metrics-*)'),
});

export const READINESS_IMPACT_GRAPH_TOOL_ID = securityTool('readiness_impact_graph');

export const readinessImpactGraphTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof readinessImpactGraphSchema> => {
  return {
    id: READINESS_IMPACT_GRAPH_TOOL_ID,
    type: ToolType.builtin,
    description: `Build and query the SIEM Readiness impact graph linking data streams to detection rules and MITRE ATT&CK tactics. Use full_graph for a complete overview, trace_stream to see which rules depend on a specific data stream, or trace_field to find rules referencing a specific field. Returns platform coverage, blast radius analysis, and uncovered streams.`,
    schema: readinessImpactGraphSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ mode, dataStream, field, indexPattern }, { esClient }) => {
      logger.debug(
        `${READINESS_IMPACT_GRAPH_TOOL_ID} called with mode: ${mode}, dataStream: ${dataStream ?? 'N/A'}, field: ${field ?? 'N/A'}`
      );

      try {
        const pattern = indexPattern ?? 'logs-*,metrics-*';

        const dataStreamQuery = `FROM ${pattern}
| STATS doc_count = COUNT(*) BY data_stream.dataset, event.category, cloud.provider, host.os.family, event.module, agent.type
| LIMIT 500`;

        const dataStreamResult = await esClient.asCurrentUser.transport.request<{
          columns: Array<{ name: string; type: string }>;
          values: unknown[][];
        }>({
          method: 'POST',
          path: '/_query',
          body: { query: dataStreamQuery },
        });

        const streams = (dataStreamResult.values ?? []).map((row) => ({
          dataset: row[0] as string | null,
          event_category: row[1] as string | null,
          cloud_provider: row[2] as string | null,
          os_family: row[3] as string | null,
          event_module: row[4] as string | null,
          agent_type: row[5] as string | null,
          doc_count: row[6] as number,
        }));

        const rulesResponse = await esClient.asCurrentUser.transport.request<{
          data: Array<{
            id: string;
            name: string;
            index: string[];
            query?: string;
            threat?: Array<{
              framework: string;
              tactic: { id: string; name: string };
              technique?: Array<{ id: string; name: string }>;
            }>;
            enabled: boolean;
          }>;
          total: number;
        }>({
          method: 'GET',
          path: '/_security/api/detection_engine/rules/_find',
          querystring: { per_page: 1000, filter: 'alert.attributes.enabled: true' },
        });

        const enabledRules = rulesResponse.data ?? [];

        const platforms = new Set<string>();
        for (const s of streams) {
          if (s.cloud_provider) platforms.add(s.cloud_provider);
          if (s.os_family) platforms.add(s.os_family);
          if (s.agent_type) platforms.add(s.agent_type);
        }

        if (mode === 'trace_stream' && dataStream) {
          const matchingRules = enabledRules.filter((rule) =>
            (rule.index ?? []).some(
              (idx) =>
                dataStream.includes(idx.replace(/\*/g, '')) ||
                idx.replace(/\*/g, '').length === 0 ||
                dataStream.match(new RegExp(idx.replace(/\*/g, '.*')))
            )
          );

          const tactics = new Set<string>();
          for (const rule of matchingRules) {
            for (const threat of rule.threat ?? []) {
              tactics.add(threat.tactic.name);
            }
          }

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  mode: 'trace_stream',
                  data_stream: dataStream,
                  blast_radius: {
                    rules_affected: matchingRules.length,
                    rule_names: matchingRules.map((r) => r.name),
                    mitre_tactics: Array.from(tactics),
                  },
                  stream_metadata: streams.find((s) => s.dataset === dataStream) ?? null,
                },
              },
            ],
          };
        }

        if (mode === 'trace_field' && field) {
          const matchingRules = enabledRules.filter(
            (rule) => rule.query && rule.query.includes(field)
          );

          const tactics = new Set<string>();
          for (const rule of matchingRules) {
            for (const threat of rule.threat ?? []) {
              tactics.add(threat.tactic.name);
            }
          }

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  mode: 'trace_field',
                  field,
                  blast_radius: {
                    rules_affected: matchingRules.length,
                    rule_names: matchingRules.map((r) => r.name),
                    mitre_tactics: Array.from(tactics),
                  },
                },
              },
            ],
          };
        }

        const coveredDatasets = new Set<string>();
        for (const rule of enabledRules) {
          for (const idx of rule.index ?? []) {
            for (const s of streams) {
              if (s.dataset && idx.replace(/\*/g, '.*').length > 0) {
                try {
                  if (new RegExp(idx.replace(/\*/g, '.*')).test(`logs-${s.dataset}`)) {
                    coveredDatasets.add(s.dataset);
                  }
                } catch {
                  // skip invalid regex patterns
                }
              }
            }
          }
        }

        const uncoveredStreams = streams
          .filter((s) => s.dataset && !coveredDatasets.has(s.dataset))
          .map((s) => s.dataset);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                mode: 'full_graph',
                graph_summary: {
                  total_data_streams: streams.length,
                  total_enabled_rules: enabledRules.length,
                  covered_streams: coveredDatasets.size,
                  uncovered_streams_count: uncoveredStreams.length,
                },
                platforms: Array.from(platforms),
                uncovered_streams: uncoveredStreams.slice(0, 50),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${READINESS_IMPACT_GRAPH_TOOL_ID}: ${message}`);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                status: 'UNKNOWN',
                error: message,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'readiness', 'impact-graph', 'coverage'],
  };
};
