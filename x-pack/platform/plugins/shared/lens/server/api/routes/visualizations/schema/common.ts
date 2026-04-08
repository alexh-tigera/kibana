/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensApiStateSchema } from '@kbn/lens-embeddable-utils';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';

/**
 * The visualization item meta returned from the server.
 *
 * These fields are defined inline (rather than referencing savedObjectProps from
 * kbn-content-management-utils) so that meta.description values appear in the
 * generated OpenAPI spec. The shared schemas don't carry descriptions, and
 * .extendsDeep() on maybe()-wrapped schemas doesn't propagate them into the OAS
 * output. If the shared schemas add descriptions in the future, these can be
 * switched back to shared refs.
 *
 * Types here must stay in sync with savedObjectSchema in
 * src/platform/packages/shared/kbn-content-management-utils/src/schema.ts
 */
export const lensItemMetaSchema = schema.object(
  {
    type: schema.string({
      meta: { description: 'Saved object type. Always `lens`.' },
    }),
    created_at: schema.maybe(
      schema.string({
        meta: { description: 'Timestamp when the visualization was created (ISO 8601).' },
      })
    ),
    updated_at: schema.maybe(
      schema.string({
        meta: { description: 'Timestamp when the visualization was last updated (ISO 8601).' },
      })
    ),
    created_by: schema.maybe(
      schema.string({
        meta: { description: 'User profile ID of the user who created the visualization.' },
      })
    ),
    updated_by: schema.maybe(
      schema.string({
        meta: { description: 'User profile ID of the user who last updated the visualization.' },
      })
    ),
    origin_id: schema.maybe(
      schema.string({
        meta: {
          description:
            'Original visualization ID before import or copy. Present when a visualization was imported into a different space.',
        },
      })
    ),
    managed: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'When `true`, the visualization is managed by Kibana and cannot be edited by users.',
        },
      })
    ),
  },
  { unknowns: 'forbid', meta: { id: 'lensItemMeta', title: 'Visualization Meta' } }
);

/**
 * The Lens response item returned from the server
 */
export const lensResponseItemSchema = schema.object(
  {
    id: schema.string({
      meta: { description: 'Unique identifier for the visualization.' },
    }),
    data: lensApiStateSchema,
    meta: asCodeMetaSchema,
  },
  { unknowns: 'forbid', meta: { id: 'lensResponseItem', title: 'Visualization Response' } }
);
