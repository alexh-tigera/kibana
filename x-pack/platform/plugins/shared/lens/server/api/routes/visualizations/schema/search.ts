/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { searchOptionsSchemas } from '@kbn/content-management-utils';

import { lensCMSearchOptionsSchema } from '../../../../content_management';
import { lensResponseItemSchema } from './common';

export const lensSearchRequestQuerySchema = schema.object({
  fields: lensCMSearchOptionsSchema.getPropSchemas().fields.extendsDeep({
    meta: {
      description:
        'Attributes to include in each result. Defaults to all. Valid values: `title`, `description`, `visualizationType`, `state`, `version`.',
    },
  }),
  search_fields: lensCMSearchOptionsSchema.getPropSchemas().searchFields.extendsDeep({
    meta: {
      description:
        'Attributes to match `query` against. Valid values: `title`, `description`, `visualizationType`. Defaults to `title` and `description`.',
    },
  }),
  query: schema.maybe(
    schema.string({
      meta: {
        description: 'Text to match against `search_fields`.',
      },
    })
  ),
  page: schema.number({
    meta: {
      description: 'Page number.',
    },
    min: 1,
    defaultValue: 1,
  }),
  per_page: schema.number({
    meta: {
      description: 'Results per page.',
    },
    defaultValue: 20,
    min: 1,
    max: 1000,
  }),
});

const lensSearchResponseMetaSchema = schema.object(
  {
    page: searchOptionsSchemas.page.extendsDeep({
      meta: { description: 'Current page number.' },
    }),
    per_page: searchOptionsSchemas.perPage.extendsDeep({
      meta: { description: 'Number of results per page.' },
    }),
    total: schema.number({
      meta: { description: 'Total number of matching visualizations.' },
    }), // TODO use shared definition
  },
  { unknowns: 'forbid' }
);

export const lensSearchResponseBodySchema = schema.object(
  {
    data: schema.arrayOf(lensResponseItemSchema, { maxSize: 100 }),
    meta: lensSearchResponseMetaSchema,
  },
  { unknowns: 'forbid' }
);
