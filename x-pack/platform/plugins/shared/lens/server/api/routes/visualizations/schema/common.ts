/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensApiStateSchema } from '@kbn/lens-embeddable-utils';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';

import { lensCommonSavedObjectSchemaV2 } from '../../../../content_management';

const savedObjectProps = lensCommonSavedObjectSchemaV2.getPropSchemas();

/**
 * The Lens item meta returned from the server
 */
export const lensItemMetaSchema = schema.object(
  {
    type: savedObjectProps.type.extendsDeep({
      meta: { description: 'Saved object type. Always `lens`.' },
    }),
    created_at: savedObjectProps.createdAt.extendsDeep({
      meta: { description: 'Timestamp when the visualization was created (ISO 8601).' },
    }),
    updated_at: savedObjectProps.updatedAt.extendsDeep({
      meta: { description: 'Timestamp when the visualization was last updated (ISO 8601).' },
    }),
    created_by: savedObjectProps.createdBy.extendsDeep({
      meta: { description: 'User profile ID of the user who created the visualization.' },
    }),
    updated_by: savedObjectProps.updatedBy.extendsDeep({
      meta: { description: 'User profile ID of the user who last updated the visualization.' },
    }),
    origin_id: savedObjectProps.originId.extendsDeep({
      meta: {
        description:
          'Original visualization ID before import or copy. Present when a visualization was imported into a different space.',
      },
    }),
    managed: savedObjectProps.managed.extendsDeep({
      meta: {
        description:
          'When `true`, the visualization is managed by Kibana and cannot be edited by users.',
      },
    }),
  },
  { unknowns: 'forbid', meta: { id: 'lensItemMeta', title: 'Visualization Meta' } }
);

/**
 * The Lens response item returned from the server
 */
export const lensResponseItemSchema = schema.object(
  {
    id: savedObjectProps.id.extendsDeep({
      meta: { description: 'Unique identifier for the visualization.' },
    }),
    data: lensApiStateSchema,
    meta: asCodeMetaSchema,
  },
  { unknowns: 'forbid', meta: { id: 'lensResponseItem', title: 'Visualization Response' } }
);
