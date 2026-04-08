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
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import {
  LENS_SAMPLING_MIN_VALUE,
  LENS_SAMPLING_MAX_VALUE,
  LENS_SAMPLING_DEFAULT_VALUE,
  LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
} from './constants';
import { filterSchema } from './filter';

export const labelSharedProp = {
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
};

export const sharedPanelInfoSchema = {
  /**
   * Title displayed in the panel header.
   */
  title: schema.maybe(
    schema.string({
      meta: {
        description: 'Title displayed in the panel header.',
      },
    })
  ),
  /**
   * Description displayed in the panel header, providing additional context about the visualization.
   */
  description: schema.maybe(
    schema.string({
      meta: {
        description:
          'Description displayed in the panel header, providing additional context about the visualization.',
      },
    })
  ),
  filters: schema.maybe(
    schema.arrayOf(asCodeFilterSchema, {
      maxSize: 100,
      meta: {
        id: 'lensPanelFilters',
        description: 'Filters applied to this panel only, in addition to any dashboard-level filters.',
      },
    })
  ),
};

export const dslOnlyPanelInfoSchema = {
  // ES|QL chart should not have the ability to define a KQL/Lucene query
  query: schema.maybe(filterSchema),
};

export const ignoringGlobalFiltersSchemaRaw = {
  /**
   * Whether to ignore global filters when fetching data for this layer.
   *
   * If true, global filters (such as those set in the dashboard or application context) will be ignored for this layer.
   * If false, global filters will be applied.
   *
   * Default: false
   * Possible values: boolean (true or false)
   */
  ignore_global_filters: schema.boolean({
    defaultValue: LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
    meta: {
      description:
        'When `true`, ignores filters from the dashboard filter bar and time picker. The visualization uses only its own panel-level filters.',
    },
  }),
};

export const layerSettingsSchema = {
  /**
   * The sampling factor for the data source.
   *
   * Determines the proportion of the data source to be used. Must be a number between 0 and 1 (inclusive).
   * - 0: No sampling (use none of the data)
   * - 1: Full sampling (use all data)
   * - Any value between 0 and 1: Use that proportion of the data
   *
   * Default: 1
   * Possible values: number (0 <= value <= 1)
   */
  sampling: schema.number({
    min: LENS_SAMPLING_MIN_VALUE,
    max: LENS_SAMPLING_MAX_VALUE,
    defaultValue: LENS_SAMPLING_DEFAULT_VALUE,
    meta: {
      description: 'Sampling factor between 0 (no sampling) and 1 (full sampling). Default is 1.',
    },
  }),
  ...ignoringGlobalFiltersSchemaRaw,
};

export const collapseBySchema = schema.oneOf(
  [
    /**
     * Average collapsed by average function
     */
    schema.literal('avg'),
    /**
     * Sum collapsed by sum function
     */
    schema.literal('sum'),
    /**
     * Max collapsed by max function
     */
    schema.literal('max'),
    /**
     * Min collapsed by min function
     */
    schema.literal('min'),
  ],
  {
    meta: {
      id: 'collapseBy',
      description:
        'Aggregation function used to collapse a breakdown dimension into a single value. Choose `avg`, `sum`, `max`, or `min`.',
    },
  }
);

export type CollapseBySchema = TypeOf<typeof collapseBySchema>;

const layerSettingsSchemaWrapped = schema.object(layerSettingsSchema);

export type LayerSettingsSchema = TypeOf<typeof layerSettingsSchemaWrapped>;

export const axisTitleSchemaProps = {
  text: schema.maybe(schema.string({ defaultValue: '', meta: { description: 'Custom text for the axis title. When empty, defaults to the field name.' } })),
  visible: schema.maybe(schema.boolean({ meta: { description: 'When `true`, displays the axis title.' } })),
};

export const legendTruncateAfterLinesSchema = schema.maybe(
  schema.number({
    defaultValue: 1,
    min: 1,
    max: 10,
    meta: {
      description: 'Maximum lines before truncating legend items. Accepts 1 to 10.',
      id: 'legendTruncateAfterLines',
    },
  })
);
