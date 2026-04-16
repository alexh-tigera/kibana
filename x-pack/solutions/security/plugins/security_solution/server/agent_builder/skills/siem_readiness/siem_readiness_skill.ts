/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  READINESS_IMPACT_GRAPH_TOOL_ID,
  READINESS_CONTINUITY_TOOL_ID,
  READINESS_RULE_DATA_TOOL_ID,
  READINESS_DETECTION_HEALTH_TOOL_ID,
  READINESS_ENRICHMENT_HEALTH_TOOL_ID,
  READINESS_ENTITY_HEALTH_TOOL_ID,
  READINESS_REPORT_TOOL_ID,
  READINESS_CASE_TOOL_ID,
  READINESS_RETENTION_TOOL_ID,
  READINESS_ECS_COVERAGE_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
} from '../../tools';

const READINESS_TOOL_IDS = [
  READINESS_IMPACT_GRAPH_TOOL_ID,
  READINESS_CONTINUITY_TOOL_ID,
  READINESS_RULE_DATA_TOOL_ID,
  READINESS_DETECTION_HEALTH_TOOL_ID,
  READINESS_ENRICHMENT_HEALTH_TOOL_ID,
  READINESS_ENTITY_HEALTH_TOOL_ID,
  READINESS_REPORT_TOOL_ID,
  READINESS_CASE_TOOL_ID,
  READINESS_RETENTION_TOOL_ID,
  READINESS_ECS_COVERAGE_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.cases,
  platformCoreTools.productDocumentation,
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
];

export const siemReadinessSkill = defineSkillType({
  id: 'siem-readiness',
  name: 'siem-readiness',
  basePath: 'skills/security/siem-readiness',
  description:
    'SIEM operational readiness assessments covering data trust, detection health, ' +
    'enrichment freshness, entity risk, retention compliance, and ECS coverage. ' +
    'Use when the user asks about SIEM readiness, data health, detection posture, ' +
    '"is everything green?", or wants a readiness report.',
  content: `# SIEM Readiness Skill

## When to Use This Skill

Use this skill when:
- A user asks about SIEM readiness, operational health, or detection posture
- A user asks "is everything green?", "is my SIEM ready?", or wants a readiness report
- A user asks about data continuity, missing logs, ingestion latency, or volume drops
- A user asks whether detection rules have the right data, field dependencies, or schema drift
- A user asks about rule execution health, silent rules, or alert volume anomalies
- A user asks about TI feed freshness, transform health, or enrichment status
- A user asks about risk engine health, entity store, or asset criticality
- A user asks about retention compliance or ECS compatibility
- A user asks "what breaks if X stops?" or "what depends on Y?"

Do **not** use this skill when:
- The user is investigating a specific security alert (use alert analysis tools)
- The user needs to create or tune detection rules (use detection rule tools)
- The user is asking about PCI/SOC2 compliance requirements (use PCI compliance skill)

## Assessment Sequencing

Always assess in three layers. Do NOT report detection health before confirming data trust.

### Layer 1: M1 Baseline (foundational)
1. **ECS coverage** — call ${READINESS_ECS_COVERAGE_TOOL_ID}: are the 5 log categories present? What % of events are ECS-compatible? What % of enabled rules have supporting data?
2. **Retention** — call ${READINESS_RETENTION_TOOL_ID}: do ILM/DLM policies meet industry benchmarks?

### Layer 2: M2a Data Trust (check second, always)
3. **Continuity** — call ${READINESS_CONTINUITY_TOOL_ID}: are streams flowing? volume drops? latency?
4. **Rule-field truth** — call ${READINESS_RULE_DATA_TOOL_ID}: do rules reference fields that exist, are typed correctly, and are populated?
5. **Impact** — call ${READINESS_IMPACT_GRAPH_TOOL_ID}: for every issue, resolve blast radius (rules → MITRE → platforms)

### Layer 3: M2b Detection + Enrichment + Entity (check last)
6. **Detection execution** — call ${READINESS_DETECTION_HEALTH_TOOL_ID}: failures, timeouts, silent rules
7. **Enrichment** — call ${READINESS_ENRICHMENT_HEALTH_TOOL_ID}: TI freshness, transforms, enrich policies
8. **Entity/risk** — call ${READINESS_ENTITY_HEALTH_TOOL_ID}: risk engine, entity store, asset criticality

### Full Report
- call ${READINESS_REPORT_TOOL_ID}: runs all layers and produces a structured readiness report

## Output Principles

1. **EVERY finding carries blast radius.** Use ${READINESS_IMPACT_GRAPH_TOOL_ID} to trace: data issue → rules affected → MITRE tactics degraded → platforms impacted.

2. **PLATFORMS, not just categories.** Group by platform (AWS Prod, macOS Endpoints, Okta) derived from ECS fields.

3. **PRIORITIZE by impact.** Sort by rules_affected × severity. "Fix CloudTrail first (23 rules) > Fix VPN (2 rules)."

4. **Severity levels:**
   - CRITICAL: data stopped, rules silently broken, risk engine down
   - WARNING: volume drop >50%, latency above SLA, sparse fields <10%
   - HEALTHY: within expected bounds
   - UNKNOWN: insufficient data or permissions to assess

5. **ACTIONS, not just findings.** Include where in Kibana to go (Fleet, Rules, Stack Management).

6. **Contextualize detection against data trust.** If data streams are silent, note: "Execution success rate is 98%, but 23 rules are querying data that isn't arriving."

7. **CASES.** For CRITICAL findings, offer to create a readiness-tagged case via ${READINESS_CASE_TOOL_ID}. Always check for duplicate open cases first.

8. **NO AUTO-REMEDIATION.** Recommend actions. Never claim a fix was applied.
`,
  getRegistryTools: () => READINESS_TOOL_IDS,
});
