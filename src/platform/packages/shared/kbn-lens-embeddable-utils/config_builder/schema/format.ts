/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { LENS_FORMAT_NUMBER_DECIMALS_DEFAULT, LENS_FORMAT_COMPACT_DEFAULT } from './constants';

const numericFormatSchema = schema.object(
  {
    type: schema.oneOf([schema.literal('number'), schema.literal('percent')]),
    /**
     * Number of decimal places to display.
     */
    decimals: schema.number({
      defaultValue: LENS_FORMAT_NUMBER_DECIMALS_DEFAULT,
      meta: {
        description: 'Number of decimal places to display.',
      },
    }),
    /**
     * Text appended after the formatted value. For example, ` req/s`.
     */
    suffix: schema.maybe(
      schema.string({
        meta: {
          description: 'Text appended after the formatted value. For example, ` req/s`.',
        },
      })
    ),
    /**
     * When `true`, abbreviates large numbers (for example, 1,000 becomes 1K).
     */
    compact: schema.boolean({
      defaultValue: LENS_FORMAT_COMPACT_DEFAULT,
      meta: {
        description: 'When `true`, abbreviates large numbers (for example, 1,000 becomes 1K).',
      },
    }),
  },
  { meta: { id: 'numericFormat', title: 'Numeric Format' } }
);

const byteFormatSchema = schema.object(
  {
    type: schema.oneOf([schema.literal('bits'), schema.literal('bytes')]),
    /**
     * Number of decimal places to display.
     */
    decimals: schema.number({
      defaultValue: LENS_FORMAT_NUMBER_DECIMALS_DEFAULT,
      meta: {
        description: 'Number of decimal places to display.',
      },
    }),
    /**
     * Text appended after the formatted value. For example, `/s`.
     */
    suffix: schema.maybe(
      schema.string({
        meta: {
          description: 'Text appended after the formatted value. For example, `/s`.',
        },
      })
    ),
  },
  { meta: { id: 'byteFormat', title: 'Byte Format' } }
);

const durationFormatSchema = schema.object(
  {
    type: schema.literal('duration'),
    /**
     * Source time unit for duration conversion (for example, `milliseconds`, `seconds`, `minutes`, `hours`).
     */
    from: schema.string({
      meta: {
        description:
          'Source time unit for duration conversion (for example, `milliseconds`, `seconds`, `minutes`, `hours`).',
      },
    }),
    /**
     * Target time unit for duration display (for example, `seconds`, `minutes`, `hours`).
     */
    to: schema.string({
      meta: {
        description:
          'Target time unit for duration display (for example, `seconds`, `minutes`, `hours`).',
      },
    }),
    /**
     * Text appended after the formatted duration value.
     */
    suffix: schema.maybe(
      schema.string({
        meta: {
          description: 'Text appended after the formatted duration value.',
        },
      })
    ),
  },
  { meta: { id: 'durationFormat', title: 'Duration Format' } }
);

const customFormatSchema = schema.object(
  {
    type: schema.literal('custom'),
    /**
     * Custom number format pattern using Numeral.js syntax. For example, `0,0.00` or `0.0%`.
     */
    pattern: schema.string({
      meta: {
        description:
          'Custom number format pattern using Numeral.js syntax. For example, `0,0.00` or `0.0%`.',
      },
    }),
  },
  { meta: { id: 'customFormat', title: 'Custom Format' } }
);

/**
 * Format configuration
 */
export const formatTypeSchema = schema.oneOf(
  [numericFormatSchema, byteFormatSchema, durationFormatSchema, customFormatSchema],
  { meta: { id: 'formatType', title: 'Format Type' } }
);

export const formatSchema = {
  /**
   * Format configuration
   */
  format: schema.maybe(formatTypeSchema),
};
