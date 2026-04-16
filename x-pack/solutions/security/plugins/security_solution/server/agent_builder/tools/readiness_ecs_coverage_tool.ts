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

const CATEGORY_EVENT_MAPPING: Record<string, string[]> = {
  endpoint: ['process', 'file', 'registry', 'driver'],
  identity: ['authentication', 'iam', 'session'],
  network: ['network'],
  cloud: ['configuration', 'api'],
  application: ['web', 'database'],
};

const CORE_ECS_FIELDS = [
  'event.category',
  'event.action',
  'event.outcome',
  'source.ip',
  'destination.ip',
  'user.name',
  'host.name',
  'process.name',
  'file.path',
  'cloud.provider',
];

const readinessEcsCoverageSchema = z.object({
  categories: z
    .array(z.enum(['endpoint', 'identity', 'network', 'cloud', 'application']))
    .optional()
    .describe(
      'M1 categories to evaluate. If omitted, checks all categories with detected event.category values.'
    ),
  ecsFieldSample: z
    .number()
    .optional()
    .describe(
      'Number of core ECS fields to check for population rates (default: 20). Larger values provide more thorough coverage analysis but take longer.'
    ),
});

export const READINESS_ECS_COVERAGE_TOOL_ID = securityTool('readiness_ecs_coverage');

export const readinessEcsCoverageTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof readinessEcsCoverageSchema> => {
  return {
    id: READINESS_ECS_COVERAGE_TOOL_ID,
    type: ToolType.builtin,
    description: `Assess ECS (Elastic Common Schema) compliance across data sources for SIEM readiness. Maps event.category values to M1 categories (Endpoint, Identity, Network, Cloud, Application), measures core ECS field population rates, and checks for field type inconsistencies. ECS compliance directly impacts detection rule effectiveness — rules expecting ECS fields will miss events that lack them.`,
    schema: readinessEcsCoverageSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ categories, ecsFieldSample = 20 }, { esClient }) => {
      logger.debug(
        `${READINESS_ECS_COVERAGE_TOOL_ID} called with categories: ${categories?.join(', ') ?? 'all'}`
      );

      try {
        const categoryPresenceQuery = `FROM logs-*,metrics-*
| WHERE event.category IS NOT NULL
| STATS doc_count = COUNT(*) BY event.category
| SORT doc_count DESC
| LIMIT 50`;

        const categoryResult = await esClient.asCurrentUser.transport.request<{
          columns: Array<{ name: string; type: string }>;
          values: unknown[][];
        }>({ method: 'POST', path: '/_query', body: { query: categoryPresenceQuery } });

        const detectedCategories = new Map<string, number>();
        for (const row of categoryResult.values ?? []) {
          const category = row[1] as string;
          const count = row[0] as number;
          if (category) {
            detectedCategories.set(category, count);
          }
        }

        const m1CategoryMap: Record<
          string,
          { present: boolean; event_categories: string[]; total_docs: number }
        > = {};

        for (const [m1Cat, eventCats] of Object.entries(CATEGORY_EVENT_MAPPING)) {
          if (categories && !categories.includes(m1Cat as never)) {
            continue;
          }

          const matchingCats = eventCats.filter((ec) => detectedCategories.has(ec));
          const totalDocs = matchingCats.reduce(
            (sum, ec) => sum + (detectedCategories.get(ec) ?? 0),
            0
          );

          m1CategoryMap[m1Cat] = {
            present: matchingCats.length > 0,
            event_categories: matchingCats,
            total_docs: totalDocs,
          };
        }

        const fieldsToCheck = CORE_ECS_FIELDS.slice(0, ecsFieldSample);

        const fieldPopulationQuery = `FROM logs-*,metrics-*
| WHERE @timestamp >= NOW() - 24h
| STATS total = COUNT(*), ${fieldsToCheck.map((f) => `\`${f.replace(/\./g, '_')}_present\` = COUNT(\`${f}\`)`).join(', ')}
| LIMIT 1`;

        let fieldPopulationRates: Record<string, number> = {};
        try {
          const fieldResult = await esClient.asCurrentUser.transport.request<{
            columns: Array<{ name: string; type: string }>;
            values: unknown[][];
          }>({ method: 'POST', path: '/_query', body: { query: fieldPopulationQuery } });

          if (fieldResult.values?.length) {
            const row = fieldResult.values[0];
            const total = row[0] as number;

            if (total > 0) {
              for (let i = 0; i < fieldsToCheck.length; i++) {
                const present = row[i + 1] as number;
                fieldPopulationRates[fieldsToCheck[i]] = Math.round((present / total) * 100);
              }
            }
          }
        } catch {
          logger.debug('Field population query failed, falling back to fieldCaps');
        }

        const fieldCapsResult = await esClient.asCurrentUser.fieldCaps({
          index: 'logs-*,metrics-*',
          fields: fieldsToCheck,
          ignore_unavailable: true,
          allow_no_indices: true,
        });

        const ecsIssues: Array<{
          field: string;
          issue: string;
          details: string;
        }> = [];

        for (const field of fieldsToCheck) {
          const fieldInfo = fieldCapsResult.fields[field];
          if (!fieldInfo) {
            ecsIssues.push({
              field,
              issue: 'missing',
              details: `Core ECS field "${field}" not found in any index mapping`,
            });
            continue;
          }

          const types = Object.keys(fieldInfo);
          if (types.length > 1) {
            ecsIssues.push({
              field,
              issue: 'type_conflict',
              details: `Field mapped as multiple types: ${types.join(', ')}`,
            });
          }

          if (
            fieldPopulationRates[field] !== undefined &&
            fieldPopulationRates[field] < 5
          ) {
            ecsIssues.push({
              field,
              issue: 'sparse',
              details: `Field populated in only ${fieldPopulationRates[field]}% of documents`,
            });
          }
        }

        const categoriesPresent = Object.values(m1CategoryMap).filter(
          (c) => c.present
        ).length;
        const totalCategories = Object.keys(m1CategoryMap).length;

        const fieldsWithData = Object.values(fieldPopulationRates).filter(
          (pct) => pct > 0
        ).length;
        const ecsCompatibilityPct =
          fieldsToCheck.length > 0
            ? Math.round((fieldsWithData / fieldsToCheck.length) * 100)
            : 0;

        const missingCategories = Object.entries(m1CategoryMap)
          .filter(([, info]) => !info.present)
          .map(([cat]) => cat);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                summary: {
                  categories_present: categoriesPresent,
                  categories_total: totalCategories,
                  category_coverage_pct: Math.round(
                    (categoriesPresent / Math.max(totalCategories, 1)) * 100
                  ),
                  ecs_compatibility_pct: ecsCompatibilityPct,
                  core_fields_checked: fieldsToCheck.length,
                  ecs_issues_count: ecsIssues.length,
                },
                categories: m1CategoryMap,
                missing_categories: missingCategories,
                field_population_rates: fieldPopulationRates,
                ecs_issues: ecsIssues,
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${READINESS_ECS_COVERAGE_TOOL_ID}: ${message}`);
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
    tags: ['security', 'readiness', 'ecs', 'data-quality', 'compliance'],
  };
};
