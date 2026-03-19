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
      // Auth: the Kibana API key generated during /slack/connect.
      // It carries the 'api:elastic_console/slack/events' application privilege.
      // No further authz check needed — the valid API key IS the authorization.
      security: {
        authz: {
          enabled: false,
          reason: 'Authenticated via the Kibana API key generated during Slack OAuth',
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

        // Use internal client: the SO type is 'agnostic' (global, not space-scoped)
        // and hidden, so a scoped client would not reach it.
        const soClient = coreStart.savedObjects.createInternalRepository([
          SLACK_CREDENTIALS_SO_TYPE,
        ]);

        await soClient.create(
          SLACK_CREDENTIALS_SO_TYPE,
          {
            bot_token: request.body.bot_token,
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
