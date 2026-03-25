/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Re-export from @kbn/workflows — canonical location
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
} from '@kbn/workflows/common/lib/regex';
