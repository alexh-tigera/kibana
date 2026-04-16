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

const RETENTION_BENCHMARKS_DAYS: Record<string, number> = {
  endpoint: 90,
  identity: 180,
  network: 90,
  cloud: 180,
  application: 90,
  email: 180,
};

const CATEGORY_INDEX_PATTERNS: Record<string, string[]> = {
  endpoint: ['logs-endpoint.*', 'logs-system.*', 'logs-windows.*', 'logs-crowdstrike.*'],
  identity: ['logs-okta.*', 'logs-azure.signinlogs*', 'logs-azure.auditlogs*', 'logs-google_workspace.*'],
  network: ['logs-network_traffic.*', 'logs-zeek.*', 'logs-suricata.*', 'logs-paloalto.*', 'logs-fortinet.*'],
  cloud: ['logs-aws.*', 'logs-azure.*', 'logs-gcp.*'],
  application: ['logs-o365.*', 'logs-salesforce.*', 'logs-github.*', 'logs-atlassian_*.*'],
  email: ['logs-o365.audit*', 'logs-proofpoint.*', 'logs-mimecast.*'],
};

const readinessRetentionSchema = z.object({
  categories: z
    .array(z.enum(['endpoint', 'identity', 'network', 'cloud', 'application', 'email']))
    .optional()
    .describe(
      'Categories to check. If omitted, checks all categories with detected data streams.'
    ),
  customBenchmarks: z
    .record(z.string(), z.number())
    .optional()
    .describe(
      'Custom retention benchmarks in days per category (overrides defaults). Example: { "endpoint": 120, "cloud": 365 }'
    ),
});

export const READINESS_RETENTION_TOOL_ID = securityTool('readiness_retention');

export const readinessRetentionTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof readinessRetentionSchema> => {
  return {
    id: READINESS_RETENTION_TOOL_ID,
    type: ToolType.builtin,
    description: `Assess data retention compliance for SIEM readiness. Compares actual data retention (from ILM/DLM policies) against industry benchmarks derived from FedRAMP, NIST 800-53, SOC2, and ISO 27001. Categories: endpoint (90d), identity (180d), network (90d), cloud (180d), application (90d), email (180d). Returns per-category compliance status with policy details and remediation guidance.`,
    schema: readinessRetentionSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ categories, customBenchmarks }, { esClient }) => {
      logger.debug(`${READINESS_RETENTION_TOOL_ID} called`);

      try {
        const benchmarks = { ...RETENTION_BENCHMARKS_DAYS, ...customBenchmarks };
        const categoriesToCheck =
          categories ?? (Object.keys(CATEGORY_INDEX_PATTERNS) as Array<keyof typeof CATEGORY_INDEX_PATTERNS>);

        const dataStreamsResponse = await esClient.asCurrentUser.indices.getDataStream({
          name: '*',
        });

        const dataStreamNames = dataStreamsResponse.data_streams.map((ds) => ds.name);
        const dataStreamLifecycles = new Map<string, { lifecycle?: { data_retention?: string } }>();

        for (const ds of dataStreamsResponse.data_streams) {
          dataStreamLifecycles.set(ds.name, {
            lifecycle: ds.lifecycle
              ? { data_retention: ds.lifecycle.data_retention }
              : undefined,
          });
        }

        const categoryResults: Array<{
          category: string;
          benchmark_days: number;
          matching_streams: string[];
          effective_retention_days: number | null;
          policy_type: string;
          policy_details: string;
          status: string;
        }> = [];

        const unmanagedStreams: string[] = [];

        for (const category of categoriesToCheck) {
          const patterns = CATEGORY_INDEX_PATTERNS[category] ?? [];
          const matchingStreams: string[] = [];

          for (const dsName of dataStreamNames) {
            for (const pattern of patterns) {
              const regex = new RegExp(pattern.replace(/\*/g, '.*'));
              if (regex.test(dsName)) {
                matchingStreams.push(dsName);
                break;
              }
            }
          }

          if (matchingStreams.length === 0) {
            categoryResults.push({
              category,
              benchmark_days: benchmarks[category] ?? 90,
              matching_streams: [],
              effective_retention_days: null,
              policy_type: 'none',
              policy_details: 'No matching data streams found',
              status: 'not_applicable',
            });
            continue;
          }

          let minRetentionDays: number | null = null;
          let policyType = 'unknown';
          let policyDetails = '';

          for (const streamName of matchingStreams) {
            const dsInfo = dataStreamLifecycles.get(streamName);

            if (dsInfo?.lifecycle?.data_retention) {
              policyType = 'DLM';
              const retentionStr = dsInfo.lifecycle.data_retention;
              const days = parseRetentionToDays(retentionStr);
              if (days !== null && (minRetentionDays === null || days < minRetentionDays)) {
                minRetentionDays = days;
                policyDetails = `DLM data_retention: ${retentionStr}`;
              }
            } else {
              try {
                const ilmExplain = await esClient.asCurrentUser.ilm.explainLifecycle({
                  index: streamName,
                });

                for (const [, indexInfo] of Object.entries(ilmExplain.indices)) {
                  if (indexInfo.managed && indexInfo.policy) {
                    policyType = 'ILM';
                    const phases = ['hot', 'warm', 'cold'];
                    let totalDays = 0;

                    for (const phase of phases) {
                      if (indexInfo.phase === phase) {
                        totalDays += parseRetentionToDays(indexInfo.age ?? '0d') ?? 0;
                      }
                    }

                    if (
                      totalDays > 0 &&
                      (minRetentionDays === null || totalDays < minRetentionDays)
                    ) {
                      minRetentionDays = totalDays;
                      policyDetails = `ILM policy: ${indexInfo.policy}, current phase: ${indexInfo.phase}`;
                    }
                  } else {
                    unmanagedStreams.push(streamName);
                  }
                }
              } catch {
                unmanagedStreams.push(streamName);
              }
            }
          }

          const benchmark = benchmarks[category] ?? 90;
          let status = 'unknown';
          if (minRetentionDays !== null) {
            status = minRetentionDays >= benchmark ? 'compliant' : 'non_compliant';
          }

          categoryResults.push({
            category,
            benchmark_days: benchmark,
            matching_streams: matchingStreams,
            effective_retention_days: minRetentionDays,
            policy_type: policyType,
            policy_details: policyDetails,
            status,
          });
        }

        const compliantCount = categoryResults.filter((c) => c.status === 'compliant').length;
        const applicableCount = categoryResults.filter(
          (c) => c.status !== 'not_applicable'
        ).length;
        const compliancePct =
          applicableCount > 0 ? Math.round((compliantCount / applicableCount) * 100) : 100;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                summary: {
                  categories_checked: categoriesToCheck.length,
                  categories_compliant: compliantCount,
                  categories_non_compliant: categoryResults.filter(
                    (c) => c.status === 'non_compliant'
                  ).length,
                  categories_not_applicable: categoryResults.filter(
                    (c) => c.status === 'not_applicable'
                  ).length,
                  compliance_pct: compliancePct,
                  benchmarks_source:
                    'FedRAMP, NIST 800-53 AU-11, SOC2, ISO 27001',
                },
                categories: categoryResults,
                unmanaged_streams: [...new Set(unmanagedStreams)].slice(0, 20),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${READINESS_RETENTION_TOOL_ID}: ${message}`);
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
    tags: ['security', 'readiness', 'retention', 'compliance'],
  };
};

function parseRetentionToDays(retention: string): number | null {
  const match = retention.match(/^(\d+)([dhms]?)$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2] || 'd';

  switch (unit) {
    case 'd':
      return value;
    case 'h':
      return Math.floor(value / 24);
    case 'm':
      return Math.floor(value / (24 * 60));
    case 's':
      return Math.floor(value / (24 * 60 * 60));
    default:
      return value;
  }
}
