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
import { filterWithLabelSchema } from './filter';
import {
  LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
  LENS_HISTOGRAM_GRANULARITY_MAX,
  LENS_HISTOGRAM_GRANULARITY_MIN,
  LENS_TERMS_LIMIT_DEFAULT,
  LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
  LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
  LENS_PERCENTILE_DEFAULT_VALUE,
  LENS_PERCENTILE_RANK_DEFAULT_VALUE,
} from './constants';
import { formatSchema } from './format';
import { labelSharedProp } from './shared';
import { builderEnums } from './enums';

export const bucketDateHistogramOperationSchema = schema.object(
  {
    /**
     * Select bucket operation type
     */
    operation: schema.literal('date_histogram'),
    ...labelSharedProp,
    /**
     * Date field to aggregate into time buckets.
     */
    field: schema.string({
      meta: {
        description: 'Date field to aggregate into time buckets.',
      },
    }),
    /**
     * Preferred time bucket size, such as `30s`, `1h`, or `1d`. Kibana may adjust this based on the time range.
     */
    suggested_interval: schema.string({
      defaultValue: LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
      meta: {
        description:
          'Preferred time bucket size, such as `30s`, `1h`, or `1d`. Kibana may adjust this based on the time range.',
      },
    }),
    /**
     * When `true`, ignores time shifts and always uses the dashboard's original time range.
     */
    use_original_time_range: schema.boolean({
      defaultValue: LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
      meta: {
        description:
          "When `true`, ignores time shifts and always uses the dashboard's original time range.",
      },
    }),
    /**
     * Include time intervals that have no matching documents.
     */
    include_empty_rows: schema.boolean({
      defaultValue: LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
      meta: {
        description: 'Include time intervals that have no matching documents.',
      },
    }),
    drop_partial_intervals: schema.maybe(
      schema.boolean({
        defaultValue: false,
        meta: {
          description: 'Exclude incomplete time intervals from the edges of the time range.',
        },
      })
    ),
  },
  { meta: { id: 'dateHistogramOperation', title: 'Date Histogram Operation' } }
);
const bucketTermsRankByCustomSharedSchema = schema.object({
  type: schema.literal('custom'),
  /**
   * Field to be used for the custom operation
   */
  field: schema.string({
    meta: {
      description: 'Numeric field to be used for the custom operation',
    },
  }),
  /**
   * Direction of the custom operation
   */
  direction: builderEnums.direction({
    meta: {
      id: 'termsRankByCustomDirection',
      description: 'Sort direction for custom ranking',
    },
  }),
});

const bucketTermsRankByCustomBaseSchema = bucketTermsRankByCustomSharedSchema.extends({
  operation: schema.oneOf([
    schema.literal('min'),
    schema.literal('max'),
    schema.literal('average'),
    schema.literal('median'),
    schema.literal('standard_deviation'),
    schema.literal('unique_count'),
    schema.literal('count'),
    schema.literal('sum'),
    schema.literal('last_value'),
  ]),
});

const bucketTermsRankByPercentileOperationSchema = bucketTermsRankByCustomSharedSchema.extends(
  {
    operation: schema.literal('percentile'),
    percentile: schema.number({
      meta: {
        description:
          'The percentile threshold (0–100) at which to compute the field value used for ranking terms.',
      },
      defaultValue: LENS_PERCENTILE_DEFAULT_VALUE,
    }),
  },
  {
    meta: {
      id: 'termsRankByPercentileOperation',
      title: 'Terms Rank By Percentile Operation',
      description:
        'Ranks terms by a percentile value of a numeric field (e.g. the 95th percentile of response time).',
    },
  }
);
const bucketTermsRankByPercentileRankOperationSchema = bucketTermsRankByCustomSharedSchema.extends(
  {
    operation: schema.literal('percentile_rank'),
    rank: schema.number({
      meta: {
        description:
          'The numeric value for which to compute the percentile rank (the percentage of field values at or below this value).',
      },
      defaultValue: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
    }),
  },
  {
    meta: {
      id: 'termsRankByPercentileRankOperation',
      title: 'Terms Rank By Percentile Rank Operation',
      description:
        'Ranks terms by the percentile rank of a single value — the proportion of field values at or below that value.',
    },
  }
);

export const bucketTermsOperationSchema = schema.object(
  {
    operation: schema.literal('terms'),
    ...formatSchema,
    ...labelSharedProp,
    /**
     * Document fields to group by. Supports up to 4 fields for multi-field term grouping.
     */
    fields: schema.arrayOf(
      schema.string({
        meta: {
          description: 'Document field name to group by.',
        },
      }),
      { minSize: 1, maxSize: 4 }
    ),
    /**
     * Maximum number of term buckets to return.
     */
    limit: schema.number({
      defaultValue: LENS_TERMS_LIMIT_DEFAULT,
      meta: { description: 'Maximum number of term buckets to return.' },
    }),
    /**
     * When `true`, uses a more accurate but slower algorithm for counting terms. Useful when the number of unique values is very high.
     */
    increase_accuracy: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'When `true`, uses a more accurate but slower algorithm for counting terms. Useful when the number of unique values is very high.',
        },
      })
    ),
    /**
     * Filter to include only specific term values in the results.
     */
    includes: schema.maybe(
      schema.object({
        values: schema.arrayOf(
          schema.string({
            meta: {
              description: 'Term values to include in results.',
            },
          }),
          { maxSize: 100 }
        ),
        as_regex: schema.maybe(
          schema.boolean({
            meta: {
              description: 'When `true`, interprets the include values as regular expressions.',
            },
          })
        ),
      })
    ),
    /**
     * Filter to exclude specific term values from the results.
     */
    excludes: schema.maybe(
      schema.object({
        values: schema.arrayOf(
          schema.string({
            meta: {
              description: 'Term values to exclude from results.',
            },
          }),
          { maxSize: 100 }
        ),
        as_regex: schema.maybe(
          schema.boolean({
            meta: {
              description: 'When `true`, interprets the exclude values as regular expressions.',
            },
          })
        ),
      })
    ),
    /**
     * Group documents that don't match the top terms into an "Other" bucket.
     */
    other_bucket: schema.maybe(
      schema.object({
        include_documents_without_field: schema.boolean({
          meta: {
            description:
              'When `true`, groups documents that lack the grouped field into the "Other" bucket.',
          },
        }),
      })
    ),
    /**
     * Rank by
     */
    rank_by: schema.maybe(
      schema.oneOf([
        schema.object(
          {
            type: schema.literal('alphabetical'),
            /**
             * Direction of the alphabetical order
             */
            direction: builderEnums.direction({
              meta: {
                id: 'termsRankByAlphabeticalDirection',
                description: 'Sort direction for alphabetical ranking',
              },
            }),
          },
          { meta: { title: 'Alphabetical' } }
        ),
        schema.object(
          {
            type: schema.literal('rare'),
            /**
             * Maximum number of rare terms
             */
            max: schema.number({
              meta: {
                description: 'Maximum number of rare terms',
              },
            }),
          },
          { meta: { title: 'Rare terms' } }
        ),
        schema.object(
          {
            type: schema.literal('significant'),
          },
          { meta: { title: 'Significant terms' } }
        ),
        schema.object(
          {
            type: schema.literal('metric'),
            metric_index: schema.number({
              defaultValue: 0,
              min: 0,
              meta: {
                description:
                  "0-based index into the metrics array (layer's metrics array if XY chart) identifying which metric to rank by. Defaults to 0 (first metric).",
              },
            }),
            direction: builderEnums.direction({
              meta: {
                id: 'termsRankByMetricDirection',
                description: 'Sort direction for metric-based ranking',
              },
            }),
          },
          { meta: { title: 'Metric' } }
        ),
        bucketTermsRankByCustomBaseSchema,
        bucketTermsRankByPercentileOperationSchema,
        bucketTermsRankByPercentileRankOperationSchema,
      ])
    ),
  },
  { meta: { id: 'termsOperation', title: 'Terms Operation' } }
);

export const bucketFiltersOperationSchema = schema.object(
  {
    operation: schema.literal('filters'),
    ...labelSharedProp,
    /**
     * Filters
     */
    filters: schema.arrayOf(filterWithLabelSchema, { maxSize: 100 }),
  },
  { meta: { id: 'filtersOperation', title: 'Filters Operation' } }
);

export const bucketHistogramOperationSchema = schema.object(
  {
    operation: schema.literal('histogram'),
    ...formatSchema,
    ...labelSharedProp,
    /**
     * Display name shown in the chart legend and tooltips.
     */
    label: schema.maybe(
      schema.string({
        meta: {
          description: 'Display name shown in the chart legend and tooltips.',
        },
      })
    ),
    /**
     * Numeric field to aggregate into buckets.
     */
    field: schema.string({
      meta: {
        description: 'Numeric field to aggregate into buckets.',
      },
    }),
    /**
     * Bucket size for the histogram. Use a number for fixed-width buckets, or `auto` to let Kibana choose.
     */
    granularity: schema.oneOf(
      [
        schema.number({
          meta: {
            description: 'Fixed numeric bucket width.',
          },
          min: LENS_HISTOGRAM_GRANULARITY_MIN,
          max: LENS_HISTOGRAM_GRANULARITY_MAX,
        }),
        schema.literal('auto'),
      ],
      {
        defaultValue: LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
      }
    ),
    /**
     * Include numeric intervals that have no matching documents.
     */
    include_empty_rows: schema.boolean({
      meta: {
        description: 'Include numeric intervals that have no matching documents.',
      },
      defaultValue: LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
    }),
  },
  { meta: { id: 'histogramOperation', title: 'Histogram Operation' } }
);

export const bucketRangesOperationSchema = schema.object(
  {
    operation: schema.literal('range'),
    ...formatSchema,
    ...labelSharedProp,
    /**
     * Display name shown in the chart legend and tooltips.
     */
    label: schema.maybe(
      schema.string({
        meta: {
          description: 'Display name shown in the chart legend and tooltips.',
        },
      })
    ),
    /**
     * Numeric field to split into custom ranges.
     */
    field: schema.string({
      meta: {
        description: 'Numeric field to split into custom ranges.',
      },
    }),
    /**
     * Array of custom range buckets defined by upper and lower bounds.
     */
    ranges: schema.arrayOf(
      schema.object({
        /**
         * Upper bound of the range (inclusive).
         */
        lte: schema.maybe(
          schema.number({
            meta: {
              description: 'Upper bound of the range (inclusive).',
            },
          })
        ),
        /**
         * Lower bound of the range (exclusive).
         */
        gt: schema.maybe(
          schema.number({
            meta: {
              description: 'Lower bound of the range (exclusive).',
            },
          })
        ),
        /**
         * Custom display label for this range bucket.
         */
        label: schema.maybe(
          schema.string({
            meta: {
              description: 'Custom display label for this range bucket.',
            },
          })
        ),
      }),
      { maxSize: 100 }
    ),
  },
  { meta: { id: 'rangesOperation', title: 'Ranges Operation' } }
);

export const bucketOperationDefinitionSchema = schema.oneOf([
  bucketDateHistogramOperationSchema,
  bucketTermsOperationSchema,
  bucketHistogramOperationSchema,
  bucketRangesOperationSchema,
  bucketFiltersOperationSchema,
]);

export type TermOperationRankByCustomBaseType = TypeOf<typeof bucketTermsRankByCustomBaseSchema>;
export type TermOperationRankByCustomPercentileType = TypeOf<
  typeof bucketTermsRankByPercentileOperationSchema
>;
export type TermOperationRankByCustomPercentileRankType = TypeOf<
  typeof bucketTermsRankByPercentileRankOperationSchema
>;

export type LensApiDateHistogramOperation = typeof bucketDateHistogramOperationSchema.type;
export type LensApiTermsOperation = typeof bucketTermsOperationSchema.type;
export type LensApiHistogramOperation = typeof bucketHistogramOperationSchema.type;
export type LensApiRangeOperation = typeof bucketRangesOperationSchema.type;
export type LensApiFiltersOperation = typeof bucketFiltersOperationSchema.type;

export type LensApiBucketOperations =
  | LensApiDateHistogramOperation
  | LensApiTermsOperation
  | LensApiHistogramOperation
  | LensApiRangeOperation
  | LensApiFiltersOperation;
