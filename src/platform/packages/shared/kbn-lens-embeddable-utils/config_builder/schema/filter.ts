/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const filterSchema = schema.object(
  {
    language: schema.oneOf([schema.literal('kql'), schema.literal('lucene')], {
      defaultValue: 'kql',
    }),
    /**
     * Filter query string in KQL or Lucene syntax. For example, `response.status_code >= 400`.
     */
    expression: schema.string({
      meta: {
        description:
          'Filter query string in KQL or Lucene syntax. For example, `response.status_code >= 400`.',
      },
    }),
  },
  { meta: { id: 'filter-simple', title: 'Filter' } }
);

export const filterWithLabelSchema = schema.object(
  {
    /**
     * Filter definition with language and query string.
     */
    filter: filterSchema,
    /**
     * Display label for this filter in the chart legend.
     */
    label: schema.maybe(
      schema.string({
        meta: {
          description: 'Display label for this filter in the chart legend.',
        },
      })
    ),
  },
  { meta: { id: 'filter-with-label', title: 'Filter with Label' } }
);

export type LensApiFilterType = typeof filterSchema.type;
