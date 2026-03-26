/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { omit } from 'lodash';
import { filterSchema } from './filter';
import { formatSchema } from './format';
import {
  LENS_LAST_VALUE_DEFAULT_MULTI_VALUE,
  LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
  LENS_PERCENTILE_DEFAULT_VALUE,
  LENS_PERCENTILE_RANK_DEFAULT_VALUE,
  LENS_STATIC_VALUE_DEFAULT,
} from './constants';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../transforms/columns/utils';
import { labelSharedProp } from './shared';

export const genericOperationOptionsSchema = schema.object({
  ...formatSchema,
  ...labelSharedProp,
});

export const staticOperationDefinitionSchema = genericOperationOptionsSchema.extends(
  {
    operation: schema.literal('static_value'),
    /**
     * A constant numeric value to display or use as a reference line threshold.
     */
    value: schema.number({
      meta: {
        description: 'A constant numeric value to display or use as a reference line threshold.',
      },
      defaultValue: LENS_STATIC_VALUE_DEFAULT,
    }),
  },
  { meta: { id: 'staticOperationDefinition', title: 'Static Operation Definition' } }
);

const advancedOperationSettings = {
  /**
   * Override the time range for this metric. For example, `1h` shows the last hour regardless of the global time picker.
   */
  reduced_time_range: schema.maybe(
    schema.string({
      meta: {
        id: 'operationReducedTimeRangeSetting',
        title: 'Operation Reduced Time Range Setting',
        description:
          'Override the time range for this metric. For example, `1h` shows the last hour regardless of the global time picker.',
      },
    })
  ),
  /**
   * Shift the time range for this metric relative to the global time picker. For example, `1d` compares against the previous day.
   */
  time_shift: schema.maybe(
    schema.string({
      meta: {
        id: 'operationTimeShiftSetting',
        title: 'Operation Time Shift Setting',
        description:
          'Shift the time range for this metric relative to the global time picker. For example, `1d` compares against the previous day.',
      },
    })
  ),
  /**
   * Filter
   */
  filter: schema.maybe(filterSchema),
  /**
   * Normalize the metric value to a time unit (`s`, `m`, `h`, or `d`). For example, `s` converts a count to a rate per second.
   */
  time_scale: schema.maybe(
    schema.oneOf(
      [schema.literal('s'), schema.literal('m'), schema.literal('h'), schema.literal('d')],
      {
        meta: {
          id: 'operationTimeScaleSetting',
          title: 'Operation Time Scale Setting',
          description:
            'Normalize the metric value to a time unit (`s`, `m`, `h`, or `d`). For example, `s` converts a count to a rate per second.',
        },
      }
    )
  ),
};

export const formulaOperationDefinitionSchema = genericOperationOptionsSchema.extends(
  {
    operation: schema.literal('formula'),
    /**
     * A Lens formula expression. For example, `count() / overall_sum(count())`.
     */
    formula: schema.string({
      meta: {
        description: 'A Lens formula expression. For example, `count() / overall_sum(count())`.',
      },
    }),
    ...omit(advancedOperationSettings, ['time_shift']),
    /**
     * Normalize the formula result to a time unit (`s`, `m`, `h`, or `d`). For example, `s` converts a count to a rate per second.
     */
    time_scale: schema.maybe(
      schema.oneOf(
        [schema.literal('s'), schema.literal('m'), schema.literal('h'), schema.literal('d')],
        {
          meta: {
            description:
              'Normalize the formula result to a time unit (`s`, `m`, `h`, or `d`). For example, `s` converts a count to a rate per second.',
          },
        }
      )
    ),
  },
  { meta: { id: 'formulaOperation', title: 'Formula Operation' } }
);

const esqlColumn = {
  column: schema.string({
    meta: {
      description: 'Name of the ES|QL result column to reference.',
    },
  }),
};

export const esqlColumnSchema = schema.object({
  ...esqlColumn,
  ...labelSharedProp,
});

export const esqlColumnWithFormatSchema = esqlColumnSchema.extends(formatSchema);

export const metricOperationSharedSchema =
  genericOperationOptionsSchema.extends(advancedOperationSettings);

export const fieldBasedOperationSharedSchema = metricOperationSharedSchema.extends({
  /**
   * Name of the document field to aggregate.
   */
  field: schema.string({ meta: { description: 'Name of the document field to aggregate.' } }),
});

const emptyAsNullSchemaRawObject = {
  /**
   * When `true`, treats empty string values and missing fields as null, which creates gaps in charts instead of displaying zero.
   */
  empty_as_null: schema.boolean({
    meta: {
      description:
        'When `true`, treats empty string values and missing fields as null, which creates gaps in charts instead of displaying zero.',
    },
    defaultValue: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
  }),
};

export const countMetricOperationSchema = fieldBasedOperationSharedSchema
  .extends(emptyAsNullSchemaRawObject)
  .extends(
    {
      /**
       * Select the operation type
       */
      operation: schema.literal('count'),
      field: schema.maybe(
        schema.string({
          meta: {
            description: 'Document field to count. When omitted, counts all documents.',
          },
        })
      ),
    },
    { meta: { id: 'countMetricOperation', title: 'Count Metric Operation' } }
  );

export const uniqueCountMetricOperationSchema = fieldBasedOperationSharedSchema
  .extends(emptyAsNullSchemaRawObject)
  .extends(
    {
      operation: schema.literal('unique_count'),
    },
    { meta: { id: 'uniqueCountMetricOperation', title: 'Unique Count Metric Operation' } }
  );

export const metricOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.oneOf([
      schema.literal('min'),
      schema.literal('max'),
      schema.literal('average'),
      schema.literal('median'),
      schema.literal('standard_deviation'),
    ]),
  },
  { meta: { id: 'minMaxAvgMedianStdDevMetricOperation', title: 'Stats Metric Operation' } }
);

export const sumMetricOperationSchema = fieldBasedOperationSharedSchema
  .extends(emptyAsNullSchemaRawObject)
  .extends(
    {
      operation: schema.literal('sum'),
    },
    { meta: { id: 'sumMetricOperation', title: 'Sum Metric Operation' } }
  );

export const lastValueOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.literal('last_value'),
    time_field: schema.string({
      meta: {
        description:
          'Field used to determine document order when selecting the last value. Typically a date field such as `@timestamp`.',
      },
    }),
    /**
     * Whether to return all values for multi-value fields.
     * Only affects data table and metric charts; other charts use the last value from the array.
     */
    multi_value: schema.boolean({
      meta: {
        description:
          'When `true`, displays each element of an array field as a separate value instead of using only the last element.',
      },
      defaultValue: LENS_LAST_VALUE_DEFAULT_MULTI_VALUE,
    }),
  },
  { meta: { id: 'lastValueOperation', title: 'Last Value Operation' } }
);

export const percentileOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.literal('percentile'),
    percentile: schema.number({
      meta: {
        description:
          'Percentile value to calculate, between 0 and 100. For example, `95` returns the 95th percentile.',
      },
      defaultValue: LENS_PERCENTILE_DEFAULT_VALUE,
    }),
  },
  { meta: { id: 'percentileOperation', title: 'Percentile Operation' } }
);

export const percentileRanksOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.literal('percentile_rank'),
    rank: schema.number({
      meta: {
        description:
          'Threshold value for the percentile rank calculation. Returns the percentage of values that fall below this number.',
      },
      defaultValue: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
    }),
  },
  { meta: { id: 'percentileRanksOperation', title: 'Percentile Ranks Operation' } }
);

export const fieldMetricOperationsSchema = schema.oneOf(
  [
    countMetricOperationSchema,
    uniqueCountMetricOperationSchema,
    metricOperationSchema,
    sumMetricOperationSchema,
    lastValueOperationSchema,
    percentileOperationSchema,
    percentileRanksOperationSchema,
  ],
  { meta: { id: 'fieldMetricOperations', title: 'Field Metric Operations' } }
);

export const differencesOperationSchema = metricOperationSharedSchema.extends(
  {
    operation: schema.literal('differences'),
    of: fieldMetricOperationsSchema,
  },
  { meta: { id: 'differencesOperation', title: 'Differences Operation' } }
);

export const movingAverageOperationSchema = metricOperationSharedSchema.extends(
  {
    operation: schema.literal('moving_average'),
    of: fieldMetricOperationsSchema,
    window: schema.number({
      meta: {
        description:
          'Number of preceding data points to include in the moving average calculation.',
      },
      defaultValue: LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
    }),
  },
  { meta: { id: 'movingAverageOperation', title: 'Moving Average Operation' } }
);

export const cumulativeSumOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.literal('cumulative_sum'),
  },
  { meta: { id: 'cumulativeSumOperation', title: 'Cumulative Sum Operation' } }
);

export const counterRateOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.literal('counter_rate'),
  },
  { meta: { id: 'counterRateOperation', title: 'Counter Rate Operation' } }
);

export const metricOperationDefinitionSchema = schema.oneOf([
  formulaOperationDefinitionSchema,
  staticOperationDefinitionSchema,
  fieldMetricOperationsSchema,
  differencesOperationSchema,
  movingAverageOperationSchema,
  cumulativeSumOperationSchema,
  counterRateOperationSchema,
  countMetricOperationSchema,
  uniqueCountMetricOperationSchema,
  lastValueOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
]);

export type LensApiAllMetricOperations = TypeOf<typeof metricOperationDefinitionSchema>;
export const fieldMetricOrFormulaOperationDefinitionSchema = schema.oneOf([
  fieldMetricOperationsSchema,
  formulaOperationDefinitionSchema,
]);

export type LensApiReferableMetricOperations =
  | LensApiCountMetricOperation
  | LensApiUniqueCountMetricOperation
  | LensApiMetricOperation
  | LensApiSumMetricOperation
  | LensApiLastValueOperation
  | LensApiPercentileOperation
  | LensApiPercentileRanksOperation;
export type LensApiFieldMetricOperations = TypeOf<typeof fieldMetricOperationsSchema>;

export type LensApiCountMetricOperation = TypeOf<typeof countMetricOperationSchema>;
export type LensApiUniqueCountMetricOperation = TypeOf<typeof uniqueCountMetricOperationSchema>;
export type LensApiMetricOperation = TypeOf<typeof metricOperationSchema>;
export type LensApiSumMetricOperation = TypeOf<typeof sumMetricOperationSchema>;
export type LensApiLastValueOperation = TypeOf<typeof lastValueOperationSchema>;
export type LensApiPercentileOperation = TypeOf<typeof percentileOperationSchema>;
export type LensApiPercentileRanksOperation = TypeOf<typeof percentileRanksOperationSchema>;
export type LensApiDifferencesOperation = TypeOf<typeof differencesOperationSchema>;
export type LensApiMovingAverageOperation = TypeOf<typeof movingAverageOperationSchema>;
export type LensApiCumulativeSumOperation = TypeOf<typeof cumulativeSumOperationSchema>;
export type LensApiCounterRateOperation = TypeOf<typeof counterRateOperationSchema>;
export type LensApiFormulaOperation = TypeOf<typeof formulaOperationDefinitionSchema>;
export type LensApiStaticValueOperation = TypeOf<typeof staticOperationDefinitionSchema>;

export type LensApiFieldMetricOrFormulaOperation =
  | LensApiFieldMetricOperations
  | LensApiFormulaOperation;

export type LensApiAllMetricOrFormulaOperations =
  | LensApiFieldMetricOperations
  | LensApiFormulaOperation
  | LensApiDifferencesOperation
  | LensApiMovingAverageOperation
  | LensApiCumulativeSumOperation
  | LensApiCounterRateOperation;

export type LensApiESQLColumn = TypeOf<typeof esqlColumnSchema>;
export type LensApiESQLColumnWithFormat = TypeOf<typeof esqlColumnWithFormatSchema>;
