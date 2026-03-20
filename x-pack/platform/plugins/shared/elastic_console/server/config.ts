/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  slack: schema.maybe(
    schema.object({
      client_id: schema.string(),
      // No state_secret needed — the OAuth state JWT is self-authenticating:
      // signed with the kibana_api_key embedded in the payload. The router
      // verifies by re-deriving the HMAC using the key from the payload itself.
    })
  ),
});

export type ElasticConsoleConfig = TypeOf<typeof configSchema>;
