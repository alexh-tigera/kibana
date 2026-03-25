/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion, ValidateWorkflowResponseDto } from '@kbn/workflows';
import { validateWorkflowYaml as validateWorkflowYamlBase } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import type { TriggerDefinitionForValidateTriggers } from './validate_triggers';
import { validateTriggers } from './validate_triggers';

export interface ValidateWorkflowYamlOptions {
  triggerDefinitions?: TriggerDefinitionForValidateTriggers[];
  getConnectors?: () => ConnectorContractUnion[];
}

/**
 * Validates workflow YAML with full plugin-level validation including trigger validation.
 * Delegates core validation (schema, liquid, step names) to @kbn/workflows and adds
 * trigger-specific validation from workflows_extensions.
 */
export function validateWorkflowYaml(
  yaml: string,
  zodSchema: z.ZodType,
  options?: ValidateWorkflowYamlOptions
): ValidateWorkflowResponseDto {
  // Delegate core validation to @kbn/workflows
  const baseResult = validateWorkflowYamlBase(yaml, zodSchema, {
    getConnectors: options?.getConnectors,
  });

  // Add trigger validation if trigger definitions are provided (plugin-specific)
  if (baseResult.parsedWorkflow && options?.triggerDefinitions) {
    const triggerValidation = validateTriggers(
      baseResult.parsedWorkflow,
      options.triggerDefinitions
    );
    for (const triggerError of triggerValidation.errors) {
      baseResult.diagnostics.push({
        severity: 'error',
        message: triggerError.message,
        source: 'trigger',
      });
    }

    // Recompute valid status after adding trigger errors
    const hasErrors = baseResult.diagnostics.some((d) => d.severity === 'error');
    return {
      ...baseResult,
      valid: !hasErrors,
    };
  }

  return baseResult;
}
