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

export const asCodeMetaSchema = schema.object(
  {
    created_at: schema.maybe(
      schema.string({ meta: { description: 'Timestamp when the object was created (ISO 8601).' } })
    ),
    created_by: schema.maybe(
      schema.string({ meta: { description: 'User profile ID of the user who created the object.' } })
    ),
    managed: schema.maybe(
      schema.boolean({
        meta: { description: 'When `true`, the object is managed by Kibana and cannot be edited by users.' },
      })
    ),
    owner: schema.maybe(
      schema.string({ meta: { description: 'The plugin that owns this object.' } })
    ),
    updated_at: schema.maybe(
      schema.string({ meta: { description: 'Timestamp when the object was last updated (ISO 8601).' } })
    ),
    updated_by: schema.maybe(
      schema.string({ meta: { description: 'User profile ID of the user who last updated the object.' } })
    ),
    version: schema.maybe(
      schema.string({ meta: { description: 'The version identifier used for conflict detection on updates.' } })
    ),
  },
  {
    meta: {
      id: 'object-meta',
    },
  }
);

export type AsCodeMeta = TypeOf<typeof asCodeMetaSchema>;
