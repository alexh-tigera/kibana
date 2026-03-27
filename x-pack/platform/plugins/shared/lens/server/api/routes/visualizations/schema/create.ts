/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensApiStateSchema } from '@kbn/lens-embeddable-utils/config_builder';

import { lensResponseItemSchema } from './common';

export const lensCreateRequestParamsSchema = schema.object(
  {
    id: schema.maybe(
      schema.string({
        meta: {
          description:
            'Custom identifier for the visualization. When omitted, Kibana generates a random ID. Use with `overwrite=true` to replace an existing visualization.',
        },
      })
    ),
  },
  { unknowns: 'forbid' }
);

// Inline schema so that description renders in OAS. See common.ts for rationale.

export const lensCreateRequestQuerySchema = schema.object(
  {
    overwrite: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'When `true` and an `id` is provided, replaces an existing visualization with that ID. Defaults to `false`.',
        },
      })
    ),
  },
  { unknowns: 'forbid' }
);

export const lensCreateRequestBodySchema = lensApiStateSchema;

export const lensCreateResponseBodySchema = lensResponseItemSchema;
