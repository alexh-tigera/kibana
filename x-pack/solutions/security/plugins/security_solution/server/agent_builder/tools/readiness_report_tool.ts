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

const readinessReportSchema = z.object({
  timeRange: z
    .string()
    .optional()
    .describe('Time range for evaluating readiness (default: 24h). Example: 24h, 7d, 30d'),
  format: z
    .enum(['full', 'executive', 'platform_detail'])
    .optional()
    .describe(
      'Report format: full includes all dimensions, executive is a high-level summary with RAG status, platform_detail breaks down by cloud/endpoint platform'
    ),
  platforms: z
    .array(z.string())
    .optional()
    .describe(
      'Platforms to include in the report (e.g., aws, azure, gcp, linux, windows). If omitted, includes all detected platforms.'
    ),
});

export const READINESS_REPORT_TOOL_ID = securityTool('readiness_report');

export const readinessReportTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof readinessReportSchema> => {
  return {
    id: READINESS_REPORT_TOOL_ID,
    type: ToolType.builtin,
    description: `Meta-tool that orchestrates a comprehensive SIEM Readiness report by instructing the agent to call individual readiness tools in sequence. Returns a structured template the agent fills by calling: readiness_impact_graph (coverage), readiness_continuity (ingestion health), readiness_rule_data (field validation), readiness_detection_health (rule execution), readiness_enrichment_health (TI/transforms), readiness_entity_health (risk scoring), readiness_retention (data retention), and readiness_ecs_coverage (ECS compliance). The assembled report includes RAG status per dimension and prioritized recommendations.`,
    schema: readinessReportSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ timeRange = '24h', format = 'full', platforms }, { esClient }) => {
      logger.debug(
        `${READINESS_REPORT_TOOL_ID} called with format: ${format}, timeRange: ${timeRange}`
      );

      try {
        const reportTemplate = {
          report_format: format,
          time_range: timeRange,
          requested_platforms: platforms ?? 'all',
          generated_at: new Date().toISOString(),
          dimensions: [
            {
              id: 'coverage',
              name: 'Data Coverage',
              tool_to_call: 'security.readiness_impact_graph',
              tool_params: { mode: 'full_graph' },
              status: 'pending',
              description: 'Maps data streams to enabled detection rules and MITRE tactics',
            },
            {
              id: 'continuity',
              name: 'Ingestion Continuity',
              tool_to_call: 'security.readiness_continuity',
              tool_params: { timeRange },
              status: 'pending',
              description: 'Detects silent streams, volume drops, and ingestion latency',
            },
            {
              id: 'rule_data',
              name: 'Rule-Data Alignment',
              tool_to_call: 'security.readiness_rule_data',
              tool_params: { scope: 'all_enabled' },
              status: 'pending',
              description: 'Validates fields and mappings required by enabled detection rules',
            },
            {
              id: 'detection_health',
              name: 'Detection Execution Health',
              tool_to_call: 'security.readiness_detection_health',
              tool_params: { timeRange },
              status: 'pending',
              description: 'Checks rule execution success rates, slow rules, and silent rules',
            },
            {
              id: 'enrichment',
              name: 'Enrichment Health',
              tool_to_call: 'security.readiness_enrichment_health',
              tool_params: {},
              status: 'pending',
              description: 'Assesses TI feed freshness, transform health, and enrich policies',
            },
            {
              id: 'entity_health',
              name: 'Entity Analytics Health',
              tool_to_call: 'security.readiness_entity_health',
              tool_params: {},
              status: 'pending',
              description: 'Checks risk scoring, asset criticality, and alert-entity match rates',
            },
            {
              id: 'retention',
              name: 'Data Retention',
              tool_to_call: 'security.readiness_retention',
              tool_params: {},
              status: 'pending',
              description: 'Compares actual retention against compliance benchmarks',
            },
            {
              id: 'ecs_coverage',
              name: 'ECS Compliance',
              tool_to_call: 'security.readiness_ecs_coverage',
              tool_params: {},
              status: 'pending',
              description: 'Measures ECS field population rates and type correctness',
            },
          ],
          instructions: `To generate the ${format} readiness report:
1. Call each tool listed in the dimensions array above, in order.
2. For each dimension, record the overall_status from the tool response.
3. Map statuses to RAG: healthy/fresh=GREEN, degraded/stale=AMBER, critical/UNKNOWN=RED.
4. After all tools complete, compile the report with:
   - Executive summary (1-3 sentence overall assessment)
   - RAG table (dimension name, status, key metric)
   - Top 3 prioritized recommendations with blast radius
   - ${format === 'platform_detail' ? 'Per-platform breakdown' : 'Aggregate view'}
5. If any tool fails, mark that dimension as RED with error details.`,
        };

        return {
          results: [
            {
              type: ToolResultType.other,
              data: reportTemplate,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${READINESS_REPORT_TOOL_ID}: ${message}`);
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
    tags: ['security', 'readiness', 'report', 'orchestrator'],
  };
};
