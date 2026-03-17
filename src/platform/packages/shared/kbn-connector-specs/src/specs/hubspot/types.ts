/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const SearchCrmObjectsInputSchema = z.object({
  objectType: z
    .enum(['contacts', 'companies', 'deals', 'tickets'])
    .describe('The type of CRM record to search or list.'),
  query: z
    .string()
    .optional()
    .describe(
      'Keyword to search CRM records by name, email, company, or other text. Omit to list all records.'
    ),
  properties: z
    .array(z.string())
    .optional()
    .describe(
      'List of property names to include in the response (e.g. ["firstname","email","phone"]).'
    ),
  limit: z.number().optional().describe('Maximum number of results to return (default: 10).'),
  after: z.string().optional().describe('Pagination cursor returned in a previous response.'),
  includeAssociatedDeals: z
    .boolean()
    .optional()
    .describe(
      'Only applies when objectType is "contacts". When true, also fetches deal IDs associated with the matching contacts and returns {contacts, associated_deals} instead of the standard paginated response.'
    ),
});
export type SearchCrmObjectsInput = z.infer<typeof SearchCrmObjectsInputSchema>;

export const GetCrmObjectInputSchema = z.object({
  objectType: z
    .enum(['contacts', 'companies', 'deals', 'tickets'])
    .describe('The type of CRM record to retrieve.'),
  objectId: z.string().describe('The HubSpot object ID of the record to retrieve.'),
  properties: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of property names to include in the response (for example, "firstname,lastname,email").'
    ),
});
export type GetCrmObjectInput = z.infer<typeof GetCrmObjectInputSchema>;

export const SearchEngagementsInputSchema = z.object({
  query: z.string().optional().describe('Search keyword to filter engagement records.'),
  engagementType: z
    .enum(['calls', 'emails', 'meetings', 'notes', 'tasks'])
    .optional()
    .describe(
      'Type of engagement to search or list. Defaults to "notes". Allowed: calls, emails, meetings, notes, tasks.'
    ),
  limit: z.number().optional().describe('Maximum number of results to return (default: 10).'),
  after: z.string().optional().describe('Pagination cursor returned in a previous response.'),
});
export type SearchEngagementsInput = z.infer<typeof SearchEngagementsInputSchema>;

export const ListOwnersInputSchema = z.object({
  limit: z.number().optional().describe('Maximum number of owners to return (default: 20).'),
  after: z.string().optional().describe('Pagination cursor returned in a previous response.'),
});
export type ListOwnersInput = z.infer<typeof ListOwnersInputSchema>;

export const SearchDealsInputSchema = z.object({
  query: z.string().optional().describe('Keyword to search for in deal names or properties.'),
  pipeline: z
    .string()
    .optional()
    .describe(
      'Pipeline ID to filter by (for example, "default"). Use list_pipelines to discover valid IDs.'
    ),
  dealStage: z
    .string()
    .optional()
    .describe(
      'Deal stage ID to filter by (for example, "appointmentscheduled", "closedwon", "closedlost"). Use list_pipelines to discover valid stage IDs.'
    ),
  ownerId: z
    .string()
    .optional()
    .describe(
      'HubSpot owner ID (hubspot_owner_id) to filter deals by. Use list_owners to resolve an owner name to their ID.'
    ),
  limit: z.number().optional().describe('Maximum number of results to return (default: 10).'),
  after: z.string().optional().describe('Pagination cursor returned in a previous response.'),
});
export type SearchDealsInput = z.infer<typeof SearchDealsInputSchema>;

export const SearchBroadInputSchema = z.object({
  query: z
    .string()
    .describe(
      'Search term to look for across all HubSpot CRM object types (contacts, companies, deals, tickets).'
    ),
  limit: z.number().optional().describe('Maximum number of results per object type (default: 5).'),
});
export type SearchBroadInput = z.infer<typeof SearchBroadInputSchema>;

export const ListPipelinesInputSchema = z.object({
  objectType: z
    .enum(['deals', 'tickets'])
    .optional()
    .describe(
      'The CRM object type to list pipelines for. Defaults to "deals". Use "tickets" for support ticket pipelines.'
    ),
});
export type ListPipelinesInput = z.infer<typeof ListPipelinesInputSchema>;
