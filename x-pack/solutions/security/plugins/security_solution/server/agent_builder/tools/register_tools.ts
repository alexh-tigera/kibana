/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../common';
import { securityLabsSearchTool } from './security_labs_search_tool';
import { attackDiscoverySearchTool } from './attack_discovery_search_tool';
import { entityRiskScoreTool, getEntityTool, searchEntitiesTool } from './entity_analytics';
import { alertsTool } from './alerts_tool';
import { createDetectionRuleTool } from './create_detection_rule_tool';
import { readinessImpactGraphTool } from './readiness_impact_graph_tool';
import { readinessContinuityTool } from './readiness_continuity_tool';
import { readinessRuleDataTool } from './readiness_rule_data_tool';
import { readinessDetectionHealthTool } from './readiness_detection_health_tool';
import { readinessEnrichmentHealthTool } from './readiness_enrichment_health_tool';
import { readinessEntityHealthTool } from './readiness_entity_health_tool';
import { readinessReportTool } from './readiness_report_tool';
import { readinessCaseTool } from './readiness_case_tool';
import { readinessRetentionTool } from './readiness_retention_tool';
import { readinessEcsCoverageTool } from './readiness_ecs_coverage_tool';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

/**
 * Registers all security agent builder tools with the agentBuilder plugin
 */
export const registerTools = async (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
) => {
  agentBuilder.tools.register(entityRiskScoreTool(core, logger));
  agentBuilder.tools.register(attackDiscoverySearchTool(core, logger));
  agentBuilder.tools.register(securityLabsSearchTool(core));
  agentBuilder.tools.register(createDetectionRuleTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(alertsTool(core, logger));
  agentBuilder.tools.register(getEntityTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(searchEntitiesTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(readinessImpactGraphTool(core, logger));
  agentBuilder.tools.register(readinessContinuityTool(core, logger));
  agentBuilder.tools.register(readinessRuleDataTool(core, logger));
  agentBuilder.tools.register(readinessDetectionHealthTool(core, logger));
  agentBuilder.tools.register(readinessEnrichmentHealthTool(core, logger));
  agentBuilder.tools.register(readinessEntityHealthTool(core, logger));
  agentBuilder.tools.register(readinessReportTool(core, logger));
  agentBuilder.tools.register(readinessCaseTool(core, logger));
  agentBuilder.tools.register(readinessRetentionTool(core, logger));
  agentBuilder.tools.register(readinessEcsCoverageTool(core, logger));
};
