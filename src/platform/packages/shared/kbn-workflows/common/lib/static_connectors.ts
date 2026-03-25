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
import { FetcherConfigSchema, KibanaStepMetaSchema } from '../../spec/schema';
import type { BaseConnectorContract } from '../../types/v1';

/**
 * Static connectors used for schema generation.
 * These are connectors that are always available regardless of dynamic connector configuration.
 */
export const staticConnectors: BaseConnectorContract[] = [
  {
    type: 'console',
    summary: 'Console',
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.string(),
    description: i18n.translate('workflows.connectors.console.description', {
      defaultMessage: 'Log a message to the workflow logs',
    }),
  },
  // Generic request types for raw API calls
  {
    type: 'elasticsearch.request',
    summary: 'Elasticsearch Request',
    paramsSchema: z.object({
      method: z.string(),
      path: z.string(),
      body: z.any().optional(),
      params: z.any().optional(),
      headers: z.any().optional(),
    }),
    outputSchema: z.any(),
    description: i18n.translate('workflows.connectors.elasticsearch.request.description', {
      defaultMessage: 'Make a generic request to an Elasticsearch API',
    }),
  },
  {
    type: 'kibana.request',
    summary: 'Kibana Request',
    paramsSchema: z.object({
      method: z.string(),
      path: z.string(),
      body: z.any().optional(),
      headers: z.any().optional(),
      fetcher: FetcherConfigSchema,
      ...KibanaStepMetaSchema,
    }),
    outputSchema: z
      .any()
      .describe(
        'JSON-parsed response body, or an empty object ({}) for 204 No Content / 304 Not Modified responses'
      ),
    description: i18n.translate('workflows.connectors.kibana.request.description', {
      defaultMessage:
        "Make a generic request to a Kibana API. APIs that return 204 No Content or 304 Not Modified produce an empty output ('{}').",
    }),
  },
];
