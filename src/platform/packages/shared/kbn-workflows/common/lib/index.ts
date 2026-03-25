/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Error classes
export {
  InvalidYamlSchemaError,
  InvalidYamlSyntaxError,
  WorkflowValidationError,
  isWorkflowValidationError,
  WorkflowConflictError,
  isWorkflowConflictError,
} from './errors';
export type { FormattedZodError, MockZodError, MockZodIssue } from './errors';

// Validation
export { validateWorkflowYaml } from './validate_workflow_yaml';
export type { ValidateWorkflowYamlOptions } from './validate_workflow_yaml';
export { validateLiquidTemplate } from './validate_liquid_template';
export type { LiquidValidationError } from './validate_liquid_template';
export { validateStepNameUniqueness } from './validate_step_names';
export type { StepNameValidationResult } from './validate_step_names';

// YAML parsing
export { parseWorkflowYamlToJSON } from './yaml/parse_workflow_yaml_to_json';
export type {
  ParseWorkflowYamlToJSONResult,
  ParseWorkflowYamlToJSONOptions,
} from './yaml/parse_workflow_yaml_to_json';
export { parseYamlToJSONWithoutValidation } from './yaml/parse_workflow_yaml_to_json_without_validation';
export { getYamlDocumentErrors } from './yaml/validate_yaml_document';

// Zod utilities
export { formatZodError } from './zod/format_zod_error';
export type { FormatZodErrorOptions, FormatZodErrorResult } from './zod/format_zod_error';
export { getZodTypeName } from './zod/get_zod_type_name';
export {
  getDetailedTypeDescription,
  getCompactTypeDescription,
  getJsonSchemaDescription,
  getTypeScriptLikeDescription,
} from './zod/zod_type_description';

// Regex utilities
export {
  VARIABLE_REGEX,
  VARIABLE_REGEX_GLOBAL,
  UNFINISHED_VARIABLE_REGEX_GLOBAL,
  ALLOWED_KEY_REGEX,
  PROPERTY_PATH_REGEX,
  LIQUID_FILTER_REGEX,
  LIQUID_BLOCK_FILTER_REGEX,
  LIQUID_BLOCK_KEYWORD_REGEX,
  LIQUID_BLOCK_START_REGEX,
  LIQUID_BLOCK_END_REGEX,
  LIQUID_EXPRESSION_REGEX_GLOBAL,
  LIQUID_OUTPUT_REGEX_GLOBAL,
  LIQUID_TAG_REGEX_GLOBAL,
  DYNAMIC_VALUE_REGEX,
  isDynamicValue,
  VARIABLE_VALUE_REGEX,
  isVariableValue,
  LIQUID_TAG_VALUE_REGEX,
  isLiquidTagValue,
} from './regex';

// Liquid error position
export { extractLiquidErrorPosition } from './extract_liquid_error_position';

// Static connectors
export { staticConnectors } from './static_connectors';
