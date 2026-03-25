/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateWorkflowYaml, WORKFLOW_ZOD_SCHEMA } from '@kbn/workflows';
import { getWorkflowTemplatesForConnector } from '../../get_workflow_templates';

/**
 * Renders a workflow YAML template by replacing `<%= key %>` placeholders
 * with fake values. This mirrors the production rendering path that uses
 * the same delimiters.
 */
function renderTemplate(yamlTemplate: string): string {
  return yamlTemplate.replace(/<%=\s*([^%]+?)\s*%>/g, (_match, key: string) => {
    const trimmedKey = key.trim();
    // Replace connector-id placeholders with a fake connector id
    if (trimmedKey.endsWith('-stack-connector-id')) {
      return 'fake-connector-id';
    }
    // Generic fallback for any other template variables
    return `fake-${trimmedKey}`;
  });
}

describe('Slack connector workflow validation', () => {
  const templates = getWorkflowTemplatesForConnector('.slack2');

  it('has workflow templates defined', () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  it.each(
    templates.map((yaml, i) => {
      const nameMatch = yaml.match(/^name:\s*['"]?([^'"\n]+)['"]?/m);
      const name = nameMatch?.[1]?.trim() ?? `workflow-${i}`;
      return [name, yaml] as const;
    })
  )('workflow "%s" passes production validation without liquid errors', (_name, yamlTemplate) => {
    const rendered = renderTemplate(yamlTemplate);
    const result = validateWorkflowYaml(rendered, WORKFLOW_ZOD_SCHEMA);

    // Schema errors about unknown connector types are expected when validating
    // against the static schema (which doesn't know about dynamic connectors
    // like slack2.sendMessage). Filter those out for this tier of testing.
    const nonConnectorTypeErrors = result.diagnostics.filter(
      (d) =>
        d.severity === 'error' &&
        d.source !== 'liquid' &&
        !d.message.includes('Invalid connector type') &&
        !d.message.includes('Unknown connector type')
    );

    // No structural/syntax errors (excluding expected connector type errors)
    expect({
      structuralErrors: nonConnectorTypeErrors.map((d) => d.message),
    }).toEqual({
      structuralErrors: [],
    });

    // No liquid template errors
    expect({
      liquidErrors: result.diagnostics.filter((d) => d.source === 'liquid').map((d) => d.message),
    }).toEqual({
      liquidErrors: [],
    });

    // No step name uniqueness errors
    expect({
      stepNameErrors: result.diagnostics
        .filter((d) => d.source === 'step-name')
        .map((d) => d.message),
    }).toEqual({
      stepNameErrors: [],
    });

    // Verify workflow has expected structure
    expect(rendered).toContain('version:');
    expect(rendered).toContain('name:');
    expect(rendered).toContain('steps:');
    expect(rendered).toContain('triggers:');
  });
});
