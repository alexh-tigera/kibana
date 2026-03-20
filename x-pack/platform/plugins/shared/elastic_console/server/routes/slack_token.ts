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

// POST /internal/elastic_console/slack/token
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
      path: '/internal/elastic_console/slack/token',
      // Only the Kibana API key created during /slack/connect — which carries the
      // 'api:elastic_console/slack/events' privilege — can call this route.
      // This prevents any other authenticated session or API key from overwriting
      // the stored credentials.
      security: {
        authz: {
          requiredPrivileges: ['api:elastic_console/slack/events'],
        },
      },
      options: { access: 'internal' },
      validate: {
        body: schema.object({
          bot_token: schema.string({ minLength: 1 }),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        // Auto-generate a scoped API key so the Slack event handler can make
        // authenticated inference calls even though Slack events are unauthenticated.
        const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
        const apiKeyResult = await esClient.security.createApiKey({
          name: `elastic-console-slack-inference-${Date.now()}`,
          expiration: '365d',
        });
        const kibanaApiKey = Buffer.from(`${apiKeyResult.id}:${apiKeyResult.api_key}`).toString(
          'base64'
        );

        // Use a scoped client so ESO's encryption wrapper intercepts the write.
        const soClient = coreStart.savedObjects.getScopedClient(request, {
          includedHiddenTypes: [SLACK_CREDENTIALS_SO_TYPE],
        });

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
