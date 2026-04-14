/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Resolves an ESLint rule id to the **lint bridge** path (`references/eslint/fix-*.md`, repo-relative).
 * Canonical patterns: `references/components/` — see `references/eslint/index.md`.
 *
 * Supported `@elastic/eui/<suffix>` suffixes: accessible-interactive-element, badge-accessibility-rules, callout-announce-on-mount,
 * consistent-is-invalid-props, icon-accessibility-rules, no-unnamed-interactive-element, no-unnamed-radio-group,
 * prefer-eui-icon-tip, require-aria-label-for-modals, require-table-caption, sr-output-disabled-tooltip,
 * tooltip-focusable-anchor.
 *
 * Usage (from Kibana repo root):
 *   node .agents/skills/accessibility/scripts/get_skill_path.mjs
 *
 * @param {string} ruleId ESLint rule id (e.g. '@elastic/eui/require-aria-label-for-modals')
 * @returns {string | undefined} Repo-relative path to `eslint/fix-*.md`, or undefined if unmapped
 */
export function getSkillPath(ruleId) {
  const rule = ruleId.replace(/^@elastic\/eui\//, '');

  /** @type {Record<string, string>} */
  const byRule = {
    'accessible-interactive-element': 'fix-accessible-interactive-element',
    'badge-accessibility-rules': 'fix-no-unnamed-interactive-element',
    'callout-announce-on-mount': 'fix-callout-announce-on-mount',
    'consistent-is-invalid-props': 'fix-consistent-is-invalid-props',
    'icon-accessibility-rules': 'fix-icon-accessibility-rules',
    'no-unnamed-interactive-element': 'fix-no-unnamed-interactive-element',
    'no-unnamed-radio-group': 'fix-no-unnamed-radio-group',
    'prefer-eui-icon-tip': 'fix-prefer-eui-icon-tip',
    'require-aria-label-for-modals': 'fix-require-aria-label-for-modals',
    'require-table-caption': 'fix-require-table-caption',
    'sr-output-disabled-tooltip': 'fix-sr-output-disabled-tooltip',
    'tooltip-focusable-anchor': 'fix-tooltip-focusable-anchor',
  };

  const folder = byRule[rule];
  if (folder) {
    return `.agents/skills/accessibility/references/eslint/${folder}.md`;
  }

  return undefined;
}
