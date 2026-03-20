/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac, createHash, randomBytes, createCipheriv } from 'crypto';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ElasticConsoleConfig } from '../config';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';

const SLACK_OAUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_REDIRECT_URI = 'https://connect.elastic.co/slack/oauth_redirect';
const SLACK_SCOPES = 'app_mentions:read,chat:write,channels:history,im:write';
const JWT_EXPIRY_SECS = 600; // 10 minutes

const signJwt = (payload: Record<string, unknown>, secret: string): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
};

// Encrypts a plaintext string using AES-256-GCM so sensitive fields (like kibana_api_key)
// are not readable in plaintext within the JWT state parameter.
// The key is derived from the state_secret so no additional config is needed.
// Output format: base64url(iv):base64url(ciphertext):base64url(authTag)
const encryptForState = (plaintext: string, stateSecret: string): string => {
  const key = createHash('sha256').update(stateSecret).update(':state-enc').digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, ciphertext, authTag].map((b) => b.toString('base64url')).join(':');
};

export const registerSlackConnectRoute = ({
  router,
  coreSetup,
  logger,
  config,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
  config: ElasticConsoleConfig;
}) => {
  router.get(
    {
      path: '/internal/elastic_console/slack/connect',
      security: { authz: { requiredPrivileges: ['agentBuilder:write'] } },
      options: { access: 'internal' },
      validate: false,
    },
    async (ctx, request, response) => {
      const slackConfig = config.slack;
      if (!slackConfig?.client_id || !slackConfig?.state_secret) {
        logger.warn('Slack connect attempted but slack config is missing');
        return response.badRequest({
          body: { message: 'Slack integration is not configured' },
        });
      }

      const [coreStart] = await coreSetup.getStartServices();

      // Generate a Kibana API key scoped to the Slack events endpoint.
      // The router stores this key and sends it as Authorization: ApiKey <key>
      // on every forwarded Slack event — Kibana verifies it natively.
      const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
      let kibanaApiKey: string;
      try {
        const apiKeyResult = await esClient.security.createApiKey({
          name: `elastic-console-slack-${Date.now()}`,
          // No expiration — key lives until manually revoked (re-connect regenerates).
          role_descriptors: {
            'elastic-console-slack': {
              // manage_own_api_key lets /slack/token create a scoped inference key
              // on behalf of this principal without needing a superuser.
              cluster: ['manage_own_api_key'],
              indices: [],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['api:elastic_console/slack/events'],
                  resources: ['*'],
                },
              ],
            },
          },
        });
        kibanaApiKey = Buffer.from(`${apiKeyResult.id}:${apiKeyResult.api_key}`).toString('base64');
      } catch (err) {
        logger.error(`Failed to create Slack API key: ${(err as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to generate Slack integration credentials' },
        });
      }

      const kibanaUrl =
        coreStart.http.basePath.publicBaseUrl ??
        `${coreStart.http.getServerInfo().protocol}://localhost:5601`;

      // Embed kibana_url and kibana_api_key in the state JWT.
      // kibana_api_key is AES-256-GCM encrypted so it is not readable in browser
      // history, proxy logs, or Slack's redirect logs — only the router (which
      // shares state_secret) can decrypt it.
      const jwtPayload = {
        kibana_url: kibanaUrl,
        kibana_api_key_enc: encryptForState(kibanaApiKey, slackConfig.state_secret),
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECS,
      };

      const state = signJwt(jwtPayload, slackConfig.state_secret);

      const params = new URLSearchParams({
        client_id: slackConfig.client_id,
        redirect_uri: SLACK_REDIRECT_URI,
        scope: SLACK_SCOPES,
        state,
      });

      return response.redirected({ headers: { location: `${SLACK_OAUTH_URL}?${params}` } });
    }
  );
};
