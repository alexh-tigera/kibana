/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import {
  SearchCrmObjectsInputSchema,
  GetCrmObjectInputSchema,
  SearchEngagementsInputSchema,
  ListOwnersInputSchema,
  SearchDealsInputSchema,
  SearchBroadInputSchema,
  ListPipelinesInputSchema,
} from './types';
import type {
  SearchCrmObjectsInput,
  GetCrmObjectInput,
  SearchEngagementsInput,
  ListOwnersInput,
  SearchDealsInput,
  SearchBroadInput,
  ListPipelinesInput,
} from './types';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

export const HubSpotConnector: ConnectorSpec = {
  metadata: {
    id: '.hubspot',
    displayName: 'HubSpot',
    description: i18n.translate('core.kibanaConnectorSpecs.hubspot.metadata.description', {
      defaultMessage: 'Connect to HubSpot to search contacts, companies, deals, and tickets.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {
          token: '',
        },
        overrides: {
          meta: {
            token: {
              sensitive: true,
              label: i18n.translate('core.kibanaConnectorSpecs.hubspot.auth.token.label', {
                defaultMessage: 'Private App Access Token',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.hubspot.auth.token.helpText', {
                defaultMessage:
                  'Your HubSpot private app access token (starts with pat-). Create one in HubSpot Settings > Integrations > Private Apps.',
              }),
              placeholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            },
          },
        },
      },
    ],
  },

  // No additional configuration fields needed — the private app token covers auth
  schema: z.object({}),

  actions: {
    searchCrmObjects: {
      isTool: false,
      input: SearchCrmObjectsInputSchema,
      handler: async (ctx, input: SearchCrmObjectsInput) => {
        let contacts: Array<{ id: string; properties: Record<string, unknown> }> | undefined;

        if (input.query) {
          // Use the CRM search API when a query is provided
          const body: Record<string, unknown> = {
            query: input.query,
            limit: input.limit ?? 10,
          };
          if (input.properties && input.properties.length > 0) {
            body.properties = input.properties;
          }
          if (input.after) {
            body.after = input.after;
          }
          const response = await ctx.client.post(
            `${HUBSPOT_API_BASE}/crm/v3/objects/${input.objectType}/search`,
            body
          );
          if (input.objectType === 'contacts' && input.includeAssociatedDeals) {
            contacts = response.data?.results ?? [];
          } else {
            return response.data;
          }
        } else {
          // Use the list API when no query is provided
          const params: Record<string, unknown> = {
            limit: input.limit ?? 10,
          };
          if (input.properties && input.properties.length > 0) {
            params.properties = input.properties.join(',');
          }
          if (input.after) {
            params.after = input.after;
          }
          const response = await ctx.client.get(
            `${HUBSPOT_API_BASE}/crm/v3/objects/${input.objectType}`,
            { params }
          );
          if (input.objectType === 'contacts' && input.includeAssociatedDeals) {
            contacts = response.data?.results ?? [];
          } else {
            return response.data;
          }
        }

        // Fetch associated deals for matched contacts
        if (!contacts || contacts.length === 0) {
          return { contacts: [], associated_deals: [] };
        }
        const assocResponse = await ctx.client.post(
          `${HUBSPOT_API_BASE}/crm/v3/associations/contacts/deals/batch/read`,
          { inputs: contacts.map(({ id }) => ({ id })) }
        );
        return { contacts, associated_deals: assocResponse.data?.results ?? [] };
      },
    },

    getCrmObject: {
      isTool: false,
      input: GetCrmObjectInputSchema,
      handler: async (ctx, input: GetCrmObjectInput) => {
        const params: Record<string, unknown> = {};
        if (input.properties) {
          params.properties = input.properties;
        }

        const response = await ctx.client.get(
          `${HUBSPOT_API_BASE}/crm/v3/objects/${input.objectType}/${input.objectId}`,
          { params }
        );
        return response.data;
      },
    },

    searchEngagements: {
      isTool: false,
      input: SearchEngagementsInputSchema,
      handler: async (ctx, input: SearchEngagementsInput) => {
        const objectType = input.engagementType ?? 'notes';

        if (input.query) {
          const body: Record<string, unknown> = {
            query: input.query,
            limit: input.limit ?? 10,
          };
          if (input.after) {
            body.after = input.after;
          }
          const response = await ctx.client.post(
            `${HUBSPOT_API_BASE}/crm/v3/objects/${objectType}/search`,
            body
          );
          return response.data;
        } else {
          const params: Record<string, unknown> = {
            limit: input.limit ?? 10,
          };
          if (input.after) {
            params.after = input.after;
          }
          const response = await ctx.client.get(
            `${HUBSPOT_API_BASE}/crm/v3/objects/${objectType}`,
            { params }
          );
          return response.data;
        }
      },
    },

    listOwners: {
      isTool: false,
      input: ListOwnersInputSchema,
      handler: async (ctx, input: ListOwnersInput) => {
        const params: Record<string, unknown> = {
          limit: input.limit ?? 20,
        };
        if (input.after) {
          params.after = input.after;
        }

        const response = await ctx.client.get(`${HUBSPOT_API_BASE}/crm/v3/owners`, { params });
        return response.data;
      },
    },

    searchDeals: {
      isTool: false,
      input: SearchDealsInputSchema,
      handler: async (ctx, input: SearchDealsInput) => {
        const body: Record<string, unknown> = {
          limit: input.limit ?? 10,
        };

        if (input.query) {
          body.query = input.query;
        }

        const filters: Array<Record<string, string>> = [];
        if (input.pipeline) {
          filters.push({ propertyName: 'pipeline', operator: 'EQ', value: input.pipeline });
        }
        if (input.dealStage) {
          filters.push({ propertyName: 'dealstage', operator: 'EQ', value: input.dealStage });
        }
        if (input.ownerId) {
          filters.push({ propertyName: 'hubspot_owner_id', operator: 'EQ', value: input.ownerId });
        }
        if (filters.length > 0) {
          body.filterGroups = [{ filters }];
        }

        if (input.after) {
          body.after = input.after;
        }

        const response = await ctx.client.post(
          `${HUBSPOT_API_BASE}/crm/v3/objects/deals/search`,
          body
        );
        return response.data;
      },
    },

    searchBroad: {
      isTool: false,
      input: SearchBroadInputSchema,
      handler: async (ctx, input: SearchBroadInput) => {
        const limit = input.limit ?? 5;
        const objectTypes = ['contacts', 'companies', 'deals', 'tickets'] as const;
        const results = await Promise.all(
          objectTypes.map(async (objectType) => {
            const response = await ctx.client.post(
              `${HUBSPOT_API_BASE}/crm/v3/objects/${objectType}/search`,
              { query: input.query, limit }
            );
            return { objectType, results: response.data?.results ?? [] };
          })
        );
        return Object.fromEntries(results.map(({ objectType, results: r }) => [objectType, r]));
      },
    },

    listPipelines: {
      isTool: false,
      input: ListPipelinesInputSchema,
      handler: async (ctx, input: ListPipelinesInput) => {
        const objectType = input.objectType ?? 'deals';
        const response = await ctx.client.get(
          `${HUBSPOT_API_BASE}/crm/v3/pipelines/${objectType}`
        );
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.hubspot.test.description', {
      defaultMessage: 'Verifies HubSpot connection by fetching contacts',
    }),
    handler: async (ctx) => {
      try {
        const response = await ctx.client.get(
          `${HUBSPOT_API_BASE}/crm/v3/objects/contacts?limit=1`,
          { validateStatus: () => true }
        );
        if (response.status === 200 || response.status === 204) {
          return { ok: true, message: 'Successfully connected to HubSpot API' };
        }
        return {
          ok: false,
          message: `HubSpot API returned status ${response.status}. Check that your private app token is valid and has the crm.objects.contacts.read scope.`,
        };
      } catch (error) {
        const err = error as { message?: string };
        return { ok: false, message: err.message ?? 'Unknown error connecting to HubSpot' };
      }
    },
  },
};
