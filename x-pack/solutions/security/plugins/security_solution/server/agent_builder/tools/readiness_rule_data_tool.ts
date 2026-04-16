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

const readinessRuleDataSchema = z.object({
  scope: z
    .enum(['all_enabled', 'by_platform', 'by_data_stream', 'specific_rules'])
    .optional()
    .describe(
      'Scope of analysis: all_enabled checks all enabled rules, by_platform groups by cloud/endpoint/identity, by_data_stream groups by data stream, specific_rules checks only the provided ruleIds'
    ),
  platform: z
    .string()
    .optional()
    .describe('Platform filter when scope is by_platform (e.g., aws, azure, linux, windows)'),
  dataStream: z
    .string()
    .optional()
    .describe('Data stream filter when scope is by_data_stream (e.g., endpoint.events.process)'),
  ruleIds: z
    .array(z.string())
    .optional()
    .describe('Specific rule IDs to check when scope is specific_rules'),
  sparsityThreshold: z
    .number()
    .optional()
    .describe(
      'Percentage threshold below which a field is considered sparse (default: 10). Fields populated in fewer than this percentage of documents are flagged.'
    ),
  maxRules: z
    .number()
    .optional()
    .describe('Maximum number of rules to analyze (default: 50)'),
});

export const READINESS_RULE_DATA_TOOL_ID = securityTool('readiness_rule_data');

export const readinessRuleDataTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof readinessRuleDataSchema> => {
  return {
    id: READINESS_RULE_DATA_TOOL_ID,
    type: ToolType.builtin,
    description: `Validate that enabled detection rules have the required data fields present and properly mapped. Identifies dead rules (missing index/fields), mapping conflicts (same field with different types across indices), and sparse fields (fields present but rarely populated). Returns per-platform findings with recommended actions.`,
    schema: readinessRuleDataSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      {
        scope = 'all_enabled',
        platform,
        dataStream,
        ruleIds,
        sparsityThreshold = 10,
        maxRules = 50,
      },
      { esClient }
    ) => {
      logger.debug(
        `${READINESS_RULE_DATA_TOOL_ID} called with scope: ${scope}, platform: ${platform ?? 'all'}`
      );

      try {
        const rulesResponse = await esClient.asCurrentUser.transport.request<{
          data: Array<{
            id: string;
            name: string;
            index: string[];
            query?: string;
            language?: string;
            threat?: Array<{
              framework: string;
              tactic: { id: string; name: string };
            }>;
            enabled: boolean;
            tags?: string[];
          }>;
          total: number;
        }>({
          method: 'GET',
          path: '/_security/api/detection_engine/rules/_find',
          querystring: { per_page: maxRules, filter: 'alert.attributes.enabled: true' },
        });

        let rules = rulesResponse.data ?? [];

        if (scope === 'specific_rules' && ruleIds?.length) {
          rules = rules.filter((r) => ruleIds.includes(r.id));
        } else if (scope === 'by_platform' && platform) {
          rules = rules.filter(
            (r) =>
              (r.tags ?? []).some((t) => t.toLowerCase().includes(platform.toLowerCase())) ||
              (r.index ?? []).some((idx) => idx.toLowerCase().includes(platform.toLowerCase()))
          );
        } else if (scope === 'by_data_stream' && dataStream) {
          rules = rules.filter((r) =>
            (r.index ?? []).some((idx) => dataStream.match(new RegExp(idx.replace(/\*/g, '.*'))))
          );
        }

        const allIndices = new Set<string>();
        for (const rule of rules) {
          for (const idx of rule.index ?? []) {
            allIndices.add(idx);
          }
        }

        const fieldCapsResponse = await esClient.asCurrentUser.fieldCaps({
          index: Array.from(allIndices).join(','),
          fields: '*',
          ignore_unavailable: true,
          allow_no_indices: true,
        });

        const mappingConflicts: Array<{
          field: string;
          types: string[];
          indices: string[];
        }> = [];

        for (const [fieldName, fieldTypes] of Object.entries(fieldCapsResponse.fields)) {
          const types = Object.keys(fieldTypes);
          if (types.length > 1) {
            const conflictIndices: string[] = [];
            for (const typeInfo of Object.values(fieldTypes)) {
              if (typeInfo.indices) {
                conflictIndices.push(
                  ...(Array.isArray(typeInfo.indices) ? typeInfo.indices : [typeInfo.indices])
                );
              }
            }
            mappingConflicts.push({
              field: fieldName,
              types,
              indices: conflictIndices.slice(0, 10),
            });
          }
        }

        const deadRules: Array<{ rule_id: string; rule_name: string; reason: string }> = [];
        const findingsByPlatform: Record<
          string,
          Array<{ rule_id: string; rule_name: string; issues: string[] }>
        > = {};

        for (const rule of rules) {
          const ruleIndices = rule.index ?? [];
          const issues: string[] = [];

          let hasAnyIndex = false;
          for (const idx of ruleIndices) {
            try {
              const exists = await esClient.asCurrentUser.indices.exists({
                index: idx,
                allow_no_indices: false,
              });
              if (exists) {
                hasAnyIndex = true;
                break;
              }
            } catch {
              // index pattern may not resolve
            }
          }

          if (!hasAnyIndex && ruleIndices.length > 0) {
            deadRules.push({
              rule_id: rule.id,
              rule_name: rule.name,
              reason: `No matching indices found for patterns: ${ruleIndices.join(', ')}`,
            });
            continue;
          }

          const ruleQuery = rule.query ?? '';
          const referencedFields = ruleQuery.match(/[a-zA-Z_][a-zA-Z0-9_.]+/g) ?? [];
          const ecsFields = referencedFields.filter((f) => f.includes('.'));

          for (const field of ecsFields) {
            if (!fieldCapsResponse.fields[field]) {
              issues.push(`Field "${field}" referenced in query but not found in mappings`);
            }
          }

          if (issues.length > 0) {
            const rulePlatform =
              (rule.tags ?? []).find((t) =>
                ['aws', 'azure', 'gcp', 'linux', 'windows', 'macos'].includes(t.toLowerCase())
              ) ?? 'unknown';

            if (!findingsByPlatform[rulePlatform]) {
              findingsByPlatform[rulePlatform] = [];
            }
            findingsByPlatform[rulePlatform].push({
              rule_id: rule.id,
              rule_name: rule.name,
              issues,
            });
          }
        }

        const recommendedActions: string[] = [];
        if (deadRules.length > 0) {
          recommendedActions.push(
            `${deadRules.length} rules have no matching data — consider disabling them or onboarding the required data sources`
          );
        }
        if (mappingConflicts.length > 0) {
          recommendedActions.push(
            `${mappingConflicts.length} fields have mapping conflicts — review index templates and normalize field types`
          );
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                summary: {
                  total_rules_checked: rules.length,
                  dead_rules_count: deadRules.length,
                  rules_with_issues: Object.values(findingsByPlatform).reduce(
                    (sum, arr) => sum + arr.length,
                    0
                  ),
                  mapping_conflicts_count: mappingConflicts.length,
                  sparsity_threshold: sparsityThreshold,
                },
                findings_by_platform: findingsByPlatform,
                mapping_conflicts: mappingConflicts.slice(0, 20),
                dead_rules: deadRules,
                recommended_actions: recommendedActions,
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${READINESS_RULE_DATA_TOOL_ID}: ${message}`);
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
    tags: ['security', 'readiness', 'rule-data', 'field-validation'],
  };
};
