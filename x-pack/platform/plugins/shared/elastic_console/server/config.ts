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
      // Signs the OAuth state JWT passed through Slack → router → Kibana.
      // No shared router secret — auth on /slack/events uses the Kibana API key
      // embedded in the JWT and forwarded by the router on every event.
      state_secret: schema.string(),
    })
  ),
});

export type ElasticConsoleConfig = TypeOf<typeof configSchema>;
