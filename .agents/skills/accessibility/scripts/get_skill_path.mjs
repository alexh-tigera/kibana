/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Resolves an ESLint rule id to the path of the matching **lint bridge** (`references/eslint/fix-*.md`).
 * Canonical usage lives under `references/components/` — see `references/rule_to_skill_index.md`.
 *
 * Usage (from Kibana repo root):
 *   node .agents/skills/accessibility/scripts/get_skill_path.mjs
 *
 * Or import `getSkillPath` from this module.
 *
 * @param {string} ruleId ESLint rule id (e.g. '@elastic/eui/require-aria-label-for-modals')
 * @returns {string | undefined} Path to the skill `.md` file relative to repo root, or undefined if no skill
 */
export function getSkillPath(ruleId) {
  const rule = ruleId.replace(/^@elastic\/eui\//, '');

  /** @type {Record<string, string>} */
  const byRule = {
    'accessible-interactive-element': 'fix-accessible-interactive-element',
    'consistent-is-invalid-props': 'fix-consistent-is-invalid-props',
    'icon-accessibility-rules': 'fix-icon-accessibility-rules',
    'no-unnamed-interactive-element': 'fix-no-unnamed-interactive-element',
    'no-unnamed-radio-group': 'fix-no-unnamed-radio-group',
    'prefer-eui-icon-tip': 'fix-prefer-eui-icon-tip',
    'require-aria-label-for-modals': 'fix-require-aria-label-for-modals',
    'require-table-caption': 'fix-no-table-captions',
    'tooltip-focusable-anchor': 'fix-tooltip-focusable-anchor',
  };

  const folder = byRule[rule];
  if (folder) {
    return `.agents/skills/accessibility/references/eslint/${folder}.md`;
  }

  return undefined;
}
