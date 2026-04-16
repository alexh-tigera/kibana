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

const readinessCaseSchema = z.object({
  finding: z.object({
    title: z.string().describe('Case title summarizing the readiness finding'),
    description: z
      .string()
      .describe(
        'Detailed description of the finding including evidence, impact, and context'
      ),
    tags: z
      .array(z.string())
      .describe('Tags for categorization (e.g., readiness, continuity, coverage)'),
    severity: z
      .enum(['critical', 'high', 'medium', 'low'])
      .describe('Severity level of the finding'),
    data_stream: z
      .string()
      .optional()
      .describe('Affected data stream, if applicable'),
    rules_affected: z
      .array(z.string())
      .optional()
      .describe('List of affected detection rule names or IDs'),
    recommended_actions: z
      .array(z.string())
      .optional()
      .describe('Ordered list of recommended remediation steps'),
  }),
});

export const READINESS_CASE_TOOL_ID = securityTool('readiness_case');

export const readinessCaseTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof readinessCaseSchema> => {
  return {
    id: READINESS_CASE_TOOL_ID,
    type: ToolType.builtin,
    description: `Prepare a SIEM Readiness finding for case creation. Structures the finding with title, description, severity, affected data streams, impacted rules, and recommended actions. Checks for existing cases with matching tags to prevent duplicates. The structured output is ready for the platform cases API to create the actual case.`,
    schema: readinessCaseSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ finding }, { esClient }) => {
      logger.debug(
        `${READINESS_CASE_TOOL_ID} called with title: ${finding.title}, severity: ${finding.severity}`
      );

      try {
        let existingCaseFound = false;
        let existingCaseId: string | null = null;

        try {
          const dedupQuery = {
            index: '.kibana*',
            query: {
              bool: {
                must: [
                  { term: { type: 'cases' } },
                  { terms: { 'cases.attributes.tags': finding.tags } },
                ],
                must_not: [{ term: { 'cases.attributes.status': 'closed' } }],
              },
            },
            size: 1,
            _source: ['cases.attributes.title', 'cases.attributes.tags'],
          };

          const dedupResult = await esClient.asCurrentUser.search(dedupQuery);
          if (dedupResult.hits.hits.length > 0) {
            existingCaseFound = true;
            existingCaseId = dedupResult.hits.hits[0]._id ?? null;
          }
        } catch {
          logger.debug('Could not check for existing cases, proceeding with case preparation');
        }

        const severityPriorityMap: Record<string, number> = {
          critical: 1,
          high: 2,
          medium: 3,
          low: 4,
        };

        const casePayload = {
          title: `[SIEM Readiness] ${finding.title}`,
          description: buildCaseDescription(finding),
          tags: ['siem-readiness', ...finding.tags],
          severity: finding.severity,
          priority: severityPriorityMap[finding.severity] ?? 3,
          owner: 'securitySolution',
        };

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                dedup_check: {
                  existing_case_found: existingCaseFound,
                  existing_case_id: existingCaseId,
                  recommendation: existingCaseFound
                    ? 'A case with matching tags already exists. Consider updating the existing case instead of creating a new one.'
                    : 'No duplicate found. Safe to create a new case.',
                },
                case_payload: casePayload,
                instructions:
                  'Use the Elastic Cases API (POST /api/cases) with the case_payload above to create the case. If an existing case was found, use PATCH /api/cases to update it instead.',
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${READINESS_CASE_TOOL_ID}: ${message}`);
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
    tags: ['security', 'readiness', 'case-management', 'remediation'],
  };
};

function buildCaseDescription(finding: {
  title: string;
  description: string;
  severity: string;
  data_stream?: string;
  rules_affected?: string[];
  recommended_actions?: string[];
}): string {
  const sections: string[] = [
    `## Finding: ${finding.title}`,
    '',
    `**Severity:** ${finding.severity.toUpperCase()}`,
    '',
    `### Description`,
    finding.description,
  ];

  if (finding.data_stream) {
    sections.push('', `**Affected Data Stream:** \`${finding.data_stream}\``);
  }

  if (finding.rules_affected?.length) {
    sections.push('', '### Affected Detection Rules');
    for (const rule of finding.rules_affected) {
      sections.push(`- ${rule}`);
    }
  }

  if (finding.recommended_actions?.length) {
    sections.push('', '### Recommended Actions');
    finding.recommended_actions.forEach((action, idx) => {
      sections.push(`${idx + 1}. ${action}`);
    });
  }

  sections.push('', '---', '*Generated by SIEM Readiness Agent*');

  return sections.join('\n');
}
