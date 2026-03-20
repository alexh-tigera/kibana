/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID } from '../lib/slack_credentials_so';

// POST /api/elastic_console/slack/token
//
// Called by the router after completing OAuth:
//   1. Router receives bot_token from Slack
//   2. Router verifies the JWT state (checks kibana_url + kibana_api_key)
//   3. Router POSTs { bot_token } here, authenticated with the kibana_api_key
//      that was embedded in the JWT during /slack/connect
//
// The route stores the token encrypted at rest via encryptedSavedObjects.
// Subsequent Slack events use the decrypted token to call the Slack API.

export const registerSlackTokenRoute = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  router.post(
    {
      path: '/api/elastic_console/slack/token',
      // Called by the elastic-console-connect router (external service) after OAuth.
      // Auth: the scoped Kibana API key generated during /slack/connect.
      // The key itself IS the authorization — only the router which received it
      // via the JWT state can call this endpoint.
      security: {
        authz: {
          enabled: false,
          reason:
            'Authenticated via the scoped Kibana API key from /slack/connect. ' +
            'The key is the authorization — no Kibana RBAC roles needed.',
        },
      },
      options: { access: 'public', authRequired: true, xsrfRequired: false },
      validate: {
        body: schema.object({
          bot_token: schema.string({ minLength: 1 }),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        // Auto-generate an API key so the Slack event handler can make
        // authenticated inference calls even though Slack events are unauthenticated.
        // Must use asInternalUser — the connect API key is a derived key and ES
        // requires derived keys to have explicit (empty) role descriptors, which
        // would create a useless key. Internal user creates an unrestricted key.
        const esClient = coreStart.elasticsearch.client.asInternalUser;
        const apiKeyResult = await esClient.security.createApiKey({
          name: `elastic-console-slack-inference-${Date.now()}`,
          expiration: '365d',
        });
        const kibanaApiKey = Buffer.from(`${apiKeyResult.id}:${apiKeyResult.api_key}`).toString(
          'base64'
        );

        // Use the internal repository so ESO's encryption wrapper intercepts the write
        // without requiring Kibana RBAC on the scoped (connect API key) request.
        // The endpoint is already authenticated via the connect API key — writing
        // through the internal repo is safe here.
        const soClient = coreStart.savedObjects.createInternalRepository([SLACK_CREDENTIALS_SO_TYPE]);

        await soClient.create(
          SLACK_CREDENTIALS_SO_TYPE,
          {
            bot_token: request.body.bot_token,
            kibana_api_key: kibanaApiKey,
            updated_at: new Date().toISOString(),
          },
          { overwrite: true, id: SLACK_CREDENTIALS_SO_ID }
        );

        logger.info('Slack bot_token stored successfully');
        return response.ok({ body: { ok: true } });
      } catch (error) {
        logger.error(`Failed to store Slack bot_token: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to store Slack credentials' },
        });
      }
    }
  );
};
