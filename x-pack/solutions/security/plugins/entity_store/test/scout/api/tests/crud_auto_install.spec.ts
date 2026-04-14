/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { Entity } from '../../../../common/domain/definitions/entity.gen';
import {
  PUBLIC_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { clearEntityStoreIndices } from '../fixtures/helpers';

apiTest.describe('Entity Store CRUD auto-install tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ kbnClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };

    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    // Do NOT install entity store — the CRUD call should auto-install it
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
    await clearEntityStoreIndices(esClient);
  });

  apiTest('Should auto-install entity store on CRUD create', async ({ apiClient, esClient }) => {
    const entityObj: Entity = {
      entity: {
        id: 'auto-install-create',
      },
    };

    // Verify the index does not exist yet
    const indexExists = await esClient.indices.exists({ index: LATEST_INDEX });
    expect(indexExists).toBe(false);

    // CRUD create should auto-install and succeed
    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);
    expect(create.body).toStrictEqual({ ok: true });

    // Verify entity exists
    const search = await esClient.search({
      index: LATEST_INDEX,
      query: { term: { 'entity.id': 'auto-install-create' } },
    });
    expect(search.hits.hits).toHaveLength(1);

    // Verify entity store status is stopped
    const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
      headers: defaultHeaders,
      responseType: 'json',
    });
    expect(status.statusCode).toBe(200);
    expect(status.body.status).toBe('stopped');
    for (const engine of status.body.engines) {
      expect(engine.status).toBe('stopped');
    }
  });

  apiTest('Should auto-install entity store on CRUD update', async ({ apiClient, esClient }) => {
    // Reset state
    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    await clearEntityStoreIndices(esClient);

    // Create triggers auto-install
    const createObj: Entity = {
      entity: { id: 'host:auto-install-update' },
      host: { name: 'auto-install-update' },
    };
    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('host'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: createObj,
    });
    expect(create.statusCode).toBe(200);

    // Update should work on the auto-installed store
    const update = await apiClient.put(
      ENTITY_STORE_ROUTES.public.CRUD_UPDATE('host') + '?force=true',
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          entity: {
            id: 'host:auto-install-update',
            name: 'updated-name',
          },
          host: { name: 'auto-install-update' },
        },
      }
    );
    expect(update.statusCode).toBe(200);

    // Verify update took effect
    const search = await esClient.search({
      index: LATEST_INDEX,
      query: { term: { 'entity.id': 'host:auto-install-update' } },
    });
    expect(search.hits.hits).toHaveLength(1);
    const source = search.hits.hits[0]._source as Record<string, unknown>;
    expect((source.entity as Record<string, unknown>)?.name).toBe('updated-name');
  });

  apiTest(
    'Should auto-install entity store on CRUD bulk update',
    async ({ apiClient, esClient }) => {
      // Reset state
      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      await clearEntityStoreIndices(esClient);

      // Create two entities (triggers auto-install on first)
      for (const id of ['bulk-auto-1', 'bulk-auto-2']) {
        const resp = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
          headers: defaultHeaders,
          responseType: 'json',
          body: { entity: { id } },
        });
        expect(resp.statusCode).toBe(200);
      }

      // Bulk update should succeed
      const bulkUpdate = await apiClient.put(ENTITY_STORE_ROUTES.public.CRUD_BULK_UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          entities: [
            { type: 'generic', doc: { entity: { id: 'bulk-auto-1' } } },
            { type: 'generic', doc: { entity: { id: 'bulk-auto-2' } } },
          ],
        },
      });
      expect(bulkUpdate.statusCode).toBe(200);
      expect(bulkUpdate.body.errors).toHaveLength(0);
    }
  );
});
