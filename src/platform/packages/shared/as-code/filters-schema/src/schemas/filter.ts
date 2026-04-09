/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Validation Schemas for As Code Filter Interface
 *
 * These schemas are used for server validation of API requests and responses
 * in * as Code APIs.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import {
  ASCODE_FILTER_OPERATOR,
  ASCODE_GROUPED_CONDITION_TYPE,
  ASCODE_FILTER_TYPE,
} from '@kbn/as-code-filters-constants';

// ====================================================================
// CORE FILTER OPERATOR AND VALUE SCHEMAS
// ====================================================================

/**
 * Schema for range values used in numeric and date filters
 */
const rangeSchema = schema.object({
  gte: schema.maybe(
    schema.oneOf([schema.number(), schema.string()], {
      meta: { description: 'Greater than or equal to. Accepts a number or a date string.' },
    })
  ),
  lte: schema.maybe(
    schema.oneOf([schema.number(), schema.string()], {
      meta: { description: 'Less than or equal to. Accepts a number or a date string.' },
    })
  ),
  gt: schema.maybe(
    schema.oneOf([schema.number(), schema.string()], {
      meta: { description: 'Greater than (exclusive). Accepts a number or a date string.' },
    })
  ),
  lt: schema.maybe(
    schema.oneOf([schema.number(), schema.string()], {
      meta: { description: 'Less than (exclusive). Accepts a number or a date string.' },
    })
  ),
  format: schema.maybe(
    schema.string({
      meta: {
        description:
          'Date format for range boundary parsing. For example, `strict_date_optional_time`.',
      },
    })
  ),
});

// ====================================================================
// BASE PROPERTIES (SHARED BY ALL FILTERS)
// ====================================================================

/**
 * Negation property that can be used at the top-level of all filters or inside condition filters
 */
const negatePropertySchema = schema.maybe(
  schema.boolean({
    meta: { description: 'When `true`, inverts the filter to exclude matching documents. Defaults to `false`.' },
  })
);

/**
 * Common top-level properties shared by all as code filters
 */
const commonBasePropertiesSchema = schema.object({
  disabled: schema.maybe(
    schema.boolean({
      meta: { description: 'When `true`, the filter is saved but not applied. Defaults to `false`.' },
    })
  ),
  negate: negatePropertySchema,
  controlled_by: schema.maybe(
    schema.string({
      meta: {
        description: 'Identifier of the component managing this filter. Used internally by controls and other plugins.',
      },
    })
  ),
  data_view_id: schema.maybe(
    schema.string({
      meta: { description: 'ID of the data view this filter applies to. When omitted, the filter applies to the default data view.' },
    })
  ),
  label: schema.maybe(
    schema.string({
      meta: { description: 'Display label shown in the filter bar. When omitted, Kibana generates one from the filter definition.' },
    })
  ),
  is_multi_index: schema.maybe(
    schema.boolean({
      meta: { description: 'When `true`, the filter can span multiple indices. Defaults to `false`.' },
    })
  ),
});

// ====================================================================
// FILTER CONDITION SCHEMAS
// ====================================================================

/**
 * Common field property for all filter conditions
 */
const baseConditionSchema = schema.object({
  field: schema.string({ meta: { description: 'Document field to filter on. For example, `response.keyword`.' } }),
  negate: negatePropertySchema,
});

/**
 * Schema for 'is' operator with single value
 */
const singleConditionSchema = baseConditionSchema.extends(
  {
    operator: schema.literal(ASCODE_FILTER_OPERATOR.IS),
    value: schema.oneOf(
      [
        schema.string({ meta: { title: 'value' } }),
        schema.number({ meta: { title: 'value' } }),
        schema.boolean({ meta: { title: 'value' } }),
      ],
      {
        meta: { description: 'Value to match. Must be a string, number, or boolean.' },
      }
    ),
  },
  {
    meta: {
      description: 'Matches documents where `field` equals a single value.',
      title: 'Condition: is',
      id: 'kbn-as-code-filters-schema_condition_is',
    },
  }
);

/**
 * Schema for 'is_one_of' operator with array values
 */
const oneOfConditionSchema = baseConditionSchema.extends(
  {
    operator: schema.literal(ASCODE_FILTER_OPERATOR.IS_ONE_OF),
    value: schema.oneOf(
      [
        schema.arrayOf(schema.string(), { maxSize: 10000 }),
        schema.arrayOf(schema.number(), { maxSize: 10000 }),
        schema.arrayOf(schema.boolean(), { maxSize: 10000 }),
      ],
      { meta: { description: 'Array of values to match. All values must be the same type (all strings, all numbers, or all booleans).' } }
    ),
  },
  {
    meta: {
      description: 'Matches documents where `field` equals any value in a list.',
      title: 'Condition: is one of',
      id: 'kbn-as-code-filters-schema_condition_is_one_of',
    },
  }
);

/**
 * Schema for 'range' operator with range value
 */
const rangeConditionSchema = baseConditionSchema.extends(
  {
    operator: schema.literal(ASCODE_FILTER_OPERATOR.RANGE),
    value: rangeSchema,
  },
  {
    meta: {
      description: 'Matches documents where `field` falls within a numeric or date range.',
      title: 'Condition: range',
      id: 'kbn-as-code-filters-schema_condition_range',
    },
  }
);

/**
 * Schema for 'exists' operator without value
 */
const existsConditionSchema = baseConditionSchema.extends(
  {
    operator: schema.literal(ASCODE_FILTER_OPERATOR.EXISTS),
    // value is intentionally omitted for exists operator
  },
  {
    meta: {
      description: 'Matches documents where `field` exists (has any non-null value). No `value` field is needed.',
      title: 'Condition: exists',
      id: 'kbn-as-code-filters-schema_condition_exists',
    },
  }
);

/**
 * Discriminated union schema for filter conditions
 */
const conditionSchema = schema.discriminatedUnion(
  'operator',
  [singleConditionSchema, oneOfConditionSchema, rangeConditionSchema, existsConditionSchema],
  {
    meta: {
      description: 'A field-level filter condition. The `operator` value determines the shape of `value`: `is` (single value), `is_one_of` (array), `range` (bounds object), or `exists` (no value needed).',
      id: 'kbn-as-code-filters-schema_conditionSchema',
    },
  }
);

// ====================================================================
// FILTER DISCRIMINATED UNION SCHEMA
// ====================================================================

export interface AsCodeGroupFilterRecursive {
  group: {
    operator: typeof ASCODE_GROUPED_CONDITION_TYPE.AND | typeof ASCODE_GROUPED_CONDITION_TYPE.OR;
    conditions: Array<TypeOf<typeof conditionSchema> | AsCodeGroupFilterRecursive>;
  };
}

/**
 * Discriminated union schema combining all condition filter types
 */
export const asCodeConditionFilterSchema = commonBasePropertiesSchema.extends(
  {
    type: schema.literal(ASCODE_FILTER_TYPE.CONDITION),
    condition: conditionSchema,
  },
  {
    meta: {
      description: 'Condition filter',
      title: 'Condition filter',
      id: 'kbn-as-code-filters-schema_asCodeConditionFilterSchema',
    },
  }
);

/**
 * Schema for logical filter groups with recursive structure
 * Uses lazy schema to handle recursive references
 */
const GROUP_FILTER_ID = 'kbn-as-code-filters-schema_groupFilter';
export const asCodeGroupFilterSchema = commonBasePropertiesSchema.extends(
  {
    type: schema.literal(ASCODE_FILTER_TYPE.GROUP),
    group: schema.object(
      {
        operator: schema.oneOf([
          schema.literal(ASCODE_GROUPED_CONDITION_TYPE.AND),
          schema.literal(ASCODE_GROUPED_CONDITION_TYPE.OR),
        ]),
        conditions: schema.arrayOf(
          schema.oneOf([
            conditionSchema,
            schema.lazy<AsCodeGroupFilterRecursive>(GROUP_FILTER_ID), // Recursive reference for nested groups
          ])
        ),
      },
      {
        meta: {
          description: 'Logical group combining conditions with AND or OR. Groups can be nested.',
          id: GROUP_FILTER_ID,
          title: 'Filter group',
        },
      }
    ),
  },
  {
    meta: {
      description: 'Grouped condition filter',
      title: 'Group filter',
      id: 'kbn-as-code-filters-schema_asCodeGroupFilterSchema',
    },
  }
);

/**
 * Schema for DSL filters
 * Includes field and params properties specific to DSL filters for preserving metadata
 */
export const asCodeDSLFilterSchema = commonBasePropertiesSchema.extends(
  {
    type: schema.literal(ASCODE_FILTER_TYPE.DSL),
    dsl: schema.recordOf(schema.string(), schema.any(), {
      meta: { description: 'Raw Elasticsearch Query DSL object. Use this for filters that cannot be expressed as a condition.' },
    }),
    field: schema.maybe(
      schema.string({
        meta: {
          description:
            'Field name for scripted or runtime field filters where the field cannot be extracted from the DSL query.',
        },
      })
    ),
    params: schema.maybe(
      schema.any({
        meta: {
          description:
            'Filter metadata passed through to the UI. May contain display values, number formats, or scripted field parameters.',
        },
      })
    ),
  },
  {
    meta: {
      description: 'DSL filter',
      title: 'DSL filter',
      id: 'kbn-as-code-filters-schema_asCodeDSLFilterSchema',
    },
  }
);

/**
 * Schema for spatial filters
 * Similar to DSL filters but with type='spatial' to preserve spatial_filter meta.type
 */
export const asCodeSpatialFilterSchema = commonBasePropertiesSchema.extends(
  {
    type: schema.literal(ASCODE_FILTER_TYPE.SPATIAL),
    dsl: schema.recordOf(schema.string(), schema.any(), {
      meta: { description: 'Elasticsearch geo query DSL object (for example, `geo_bounding_box` or `geo_shape`).' },
    }),
  },
  {
    meta: {
      description: 'Spatial filter',
      title: 'Spatial filter',
      id: 'kbn-as-code-filters-schema_asCodeSpatialFilterSchema',
    },
  }
);

/**
 * Main discriminated union schema for Filter
 * Uses 'type' as discriminator to validate condition, group, dsl, or spatial filters
 */
export const asCodeFilterSchema = schema.discriminatedUnion(
  'type',
  [
    asCodeConditionFilterSchema,
    asCodeGroupFilterSchema,
    asCodeDSLFilterSchema,
    asCodeSpatialFilterSchema,
  ],
  {
    meta: {
      description: 'A filter. The `type` field determines the shape: `condition` for field-level filters, `group` for AND/OR logic, `dsl` for raw Elasticsearch queries, or `spatial` for geo filters.',
      id: 'kbn-as-code-filters-schema_asCodeFilterSchema',
    },
  }
);
