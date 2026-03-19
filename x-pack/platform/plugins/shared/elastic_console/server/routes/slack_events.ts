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
import { handleSlackEvent } from '../lib/slack_handler';

// POST /api/elastic_console/slack/events
//
// Receives Slack events forwarded by the router.
// Auth: standard Kibana API key (Authorization: ApiKey <key>).
// The key was generated during /slack/connect and is stored by the router.
// Kibana verifies the key before the handler runs — no custom auth code needed.

export const registerSlackEventsRoute = ({
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
      path: '/api/elastic_console/slack/events',
      security: {
        authz: {
          enabled: false,
          reason: 'Authenticated via scoped Kibana API key generated during Slack OAuth',
        },
      },
      options: { access: 'public' },
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (ctx, request, response) => {
      const body = request.body as Record<string, unknown>;

      // Handle Slack URL verification challenge (one-time during app setup)
      if (body.type === 'url_verification') {
        return response.ok({ body: { challenge: body.challenge } });
      }

      if (body.type !== 'event_callback') {
        return response.ok({ body: { ok: true } });
      }

      const event = body.event as Record<string, unknown> | undefined;
      if (!event) {
        return response.ok({ body: { ok: true } });
      }

      // Ack immediately — Slack requires a 200 within 3 seconds.
      // Processing runs asynchronously after the response is sent.
      setImmediate(async () => {
        try {
          const [coreStart, pluginsStart] = await coreSetup.getStartServices();

          // Load bot token from encrypted saved objects
          const esoClient = pluginsStart.encryptedSavedObjects.getClient({
            includedHiddenTypes: [SLACK_CREDENTIALS_SO_TYPE],
          });

          let botToken: string;
          try {
            const creds = await esoClient.getDecryptedAsInternalUser<{ bot_token: string }>(
              SLACK_CREDENTIALS_SO_TYPE,
              SLACK_CREDENTIALS_SO_ID
            );
            botToken = creds.attributes.bot_token;
          } catch (credErr) {
            logger.warn(
              `Slack event received but no bot_token stored yet — run /slack/connect first: ${
                (credErr as Error).message
              }`
            );
            return;
          }

          await handleSlackEvent({
            event: {
              type: event.type as string,
              ts: event.ts as string,
              channel: event.channel as string,
              thread_ts: event.thread_ts as string | undefined,
              text: event.text as string | undefined,
              user: event.user as string | undefined,
            },
            botToken,
            coreStart,
            inference: pluginsStart.inference,
            request,
            logger,
          });
        } catch (error) {
          logger.error(`Slack event processing error: ${(error as Error).message}`);
        }
      });

      return response.ok({ body: { ok: true } });
    }
  );
};
