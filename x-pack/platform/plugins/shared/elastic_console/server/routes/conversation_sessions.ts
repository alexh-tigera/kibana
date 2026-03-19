/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { createConversationStorage } from '../lib/conversation_storage';
import { SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID } from '../lib/slack_credentials_so';
import { sendHandoffNotification } from '../lib/notification_service';
import { isElasticConsoleEnabled } from './is_enabled';

const getSpace = (basePath: string): string => {
  const spaceMatch = basePath.match(/(?:^|\/)s\/([^/]+)/);
  return spaceMatch ? spaceMatch[1] : 'default';
};

export const registerConversationSessionRoutes = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  // POST /internal/elastic_console/conversations/:id/fork
  // Creates a new forked conversation seeded with the parent's last response.
  router.post(
    {
      path: '/internal/elastic_console/conversations/{id}/fork',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is called by external agents using router secret auth',
        },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({ id: schema.string() }),
        body: schema.object({
          origin_ref: schema.string(),
          origin_location: schema.string(),
          connector_id: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const storage = createConversationStorage({ esClient, logger });

        const parent = await storage.get({ id: request.params.id });
        if (!parent.found) {
          return response.notFound({ body: { message: 'Conversation not found' } });
        }

        const rounds =
          (parent._source?.conversation_rounds as Array<Record<string, unknown>>) ?? [];
        if (rounds.length === 0) {
          return response.badRequest({
            body: { message: 'Cannot fork a conversation with no history yet' },
          });
        }

        const lastRound = rounds[rounds.length - 1];
        const forkContext =
          (lastRound?.response as Record<string, unknown> | undefined)?.message ?? '';

        const { origin_ref, origin_location, connector_id } = request.body;

        const id = uuidv4();
        const now = new Date().toISOString();
        const basePath = coreStart.http.basePath.get(request);
        const space = getSpace(basePath);

        await storage.index({
          id,
          document: {
            agent_id: parent._source?.agent_id,
            title: `Fork of ${request.params.id}`,
            conversation_rounds: [],
            user_id: parent._source?.user_id,
            user_name: parent._source?.user_name,
            space,
            created_at: now,
            updated_at: now,
            state: {
              fork_context: forkContext,
              origin_ref,
              origin_location,
              connector_id: connector_id ?? null,
              location: null,
            },
          },
        });

        return response.ok({ body: { id, fork_context: forkContext } });
      } catch (error) {
        logger.error(`Fork conversation error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // POST /internal/elastic_console/conversations/:id/locate
  // Moves a conversation to a new location (e.g. cli, mcp).
  // On first Slack→other transition, captures origin fields automatically.
  router.post(
    {
      path: '/internal/elastic_console/conversations/{id}/locate',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is called by external agents using router secret auth',
        },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({ id: schema.string() }),
        body: schema.object({ location: schema.string() }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const storage = createConversationStorage({ esClient, logger });

        const result = await storage.get({ id: request.params.id });
        if (!result.found) {
          return response.notFound({ body: { message: 'Conversation not found' } });
        }

        const currentState = (result._source?.state as Record<string, unknown>) ?? {};
        const currentLocation = currentState.location as string | undefined;
        const forkContext = currentState.fork_context as string | undefined;
        const { location } = request.body;

        // Detect first Slack→other transition and capture origin fields
        const isSlackOrigin =
          typeof currentLocation === 'string' && currentLocation.startsWith('slack:');
        const isMovingOut = location !== currentLocation;
        const originNotSet = !currentState.origin_location;

        const stateUpdates: Record<string, unknown> = {
          location,
          located_at: new Date().toISOString(),
          fork_context: null,
        };

        if (isSlackOrigin && isMovingOut && originNotSet) {
          stateUpdates.origin_location = currentLocation;
          stateUpdates.origin_ref = currentLocation;
        }

        const updatedDoc = {
          ...result._source,
          state: { ...currentState, ...stateUpdates },
          updated_at: new Date().toISOString(),
        };

        await storage.index({ id: request.params.id, document: updatedDoc });

        return response.ok({
          body: { conversation: updatedDoc, fork_context: forkContext ?? null },
        });
      } catch (error) {
        logger.error(`Locate conversation error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // POST /internal/elastic_console/conversations/:id/handoff
  // Returns a conversation to its origin location.
  // Slack notification is handled separately by the Slack handler.
  router.post(
    {
      path: '/internal/elastic_console/conversations/{id}/handoff',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is called by external agents using router secret auth',
        },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({ id: schema.string() }),
        body: schema.object({
          summary: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const storage = createConversationStorage({ esClient, logger });

        const result = await storage.get({ id: request.params.id });
        if (!result.found) {
          return response.notFound({ body: { message: 'Conversation not found' } });
        }

        const currentState = (result._source?.state as Record<string, unknown>) ?? {};
        const originLocation = currentState.origin_location as string | undefined;
        const originRef = currentState.origin_ref as string | undefined;

        const stateUpdates: Record<string, unknown> = {};
        if (originLocation) {
          stateUpdates.location = originLocation;
        }
        if (request.body.summary) {
          stateUpdates.handoff_summary = request.body.summary;
        }

        await storage.index({
          id: request.params.id,
          document: {
            ...result._source,
            state: { ...currentState, ...stateUpdates },
            updated_at: new Date().toISOString(),
          },
        });

        // If the origin is Slack, post a notification to the original thread.
        // Best-effort — a notification failure does not fail the handoff.
        if (originRef?.startsWith('slack:')) {
          setImmediate(async () => {
            try {
              const esoClient = pluginsStart.encryptedSavedObjects.getClient({
                includedHiddenTypes: [SLACK_CREDENTIALS_SO_TYPE],
              });
              const creds = await esoClient.getDecryptedAsInternalUser<{ bot_token: string }>(
                SLACK_CREDENTIALS_SO_TYPE,
                SLACK_CREDENTIALS_SO_ID
              );
              await sendHandoffNotification(creds.attributes.bot_token, {
                originRef,
                summary: request.body.summary,
              });
            } catch (notifyErr) {
              logger.warn(`Handoff Slack notification failed: ${(notifyErr as Error).message}`);
            }
          });
        }

        return response.ok({
          body: {
            origin_location: originLocation ?? null,
            origin_ref: originRef ?? null,
          },
        });
      } catch (error) {
        logger.error(`Handoff conversation error: ${(error as Error).message}`);
        return response.customError({
          statusCode: (error as { statusCode?: number }).statusCode || 500,
          body: { message: (error as Error).message },
        });
      }
    }
  );
};
