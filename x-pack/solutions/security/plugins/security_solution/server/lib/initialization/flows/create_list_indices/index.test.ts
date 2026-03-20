/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { InitializationFlowContext } from '../../types';
import { FlowInitializationError } from '../../flow_registry';
import { createListIndicesInitializationFlow } from '.';
import type { CreateListIndicesInitializationFlowContext } from './types';

const createMockListClient = () => ({
  getListDataStreamExists: jest.fn().mockResolvedValue(false),
  getListItemDataStreamExists: jest.fn().mockResolvedValue(false),
  getListTemplateExists: jest.fn().mockResolvedValue(true),
  getListItemTemplateExists: jest.fn().mockResolvedValue(true),
  setListTemplate: jest.fn().mockResolvedValue({}),
  setListItemTemplate: jest.fn().mockResolvedValue({}),
  getListIndexExists: jest.fn().mockResolvedValue(false),
  getListItemIndexExists: jest.fn().mockResolvedValue(false),
  createListDataStream: jest.fn().mockResolvedValue({}),
  createListItemDataStream: jest.fn().mockResolvedValue({}),
  migrateListIndexToDataStream: jest.fn().mockResolvedValue(undefined),
  migrateListItemIndexToDataStream: jest.fn().mockResolvedValue(undefined),
});

const createMockInitializationFlowContext = (listsContext: unknown): InitializationFlowContext =>
  ({
    requestHandlerContext: {
      lists: listsContext,
    },
  } as unknown as InitializationFlowContext);

describe('createListIndicesInitializationFlow', () => {
  it('has the correct id', () => {
    expect(createListIndicesInitializationFlow.id).toBe('create-list-indices');
  });

  describe('resolveProvisionContext', () => {
    it('throws a FlowInitializationError when the lists plugin context is unavailable', async () => {
      const logger = loggerMock.create();
      const context = createMockInitializationFlowContext(undefined);

      await expect(
        createListIndicesInitializationFlow.resolveProvisionContext(context, logger)
      ).rejects.toThrow(FlowInitializationError);

      await expect(
        createListIndicesInitializationFlow.resolveProvisionContext(context, logger)
      ).rejects.toThrow('lists plugin is not available');
    });

    it('returns the internalListClient when the lists plugin context is available', async () => {
      const logger = loggerMock.create();
      const listClient = createMockListClient();
      const context = createMockInitializationFlowContext({
        getInternalListClient: () => listClient,
      });

      const provisionContext = await createListIndicesInitializationFlow.resolveProvisionContext(
        context,
        logger
      );

      expect(provisionContext).toEqual({ internalListClient: listClient });
    });
  });

  describe('provision', () => {
    const buildContext = (
      listClient: ReturnType<typeof createMockListClient>
    ): CreateListIndicesInitializationFlowContext => ({
      internalListClient:
        listClient as unknown as CreateListIndicesInitializationFlowContext['internalListClient'],
    });

    describe('when both data streams already exist', () => {
      it('returns ready without setting templates or creating data streams', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListDataStreamExists.mockResolvedValue(true);
        listClient.getListItemDataStreamExists.mockResolvedValue(true);
        listClient.getListTemplateExists.mockResolvedValue(true);
        listClient.getListItemTemplateExists.mockResolvedValue(true);

        const result = await createListIndicesInitializationFlow.provision(
          buildContext(listClient),
          logger
        );

        expect(result).toEqual({ status: 'ready' });
        expect(listClient.setListTemplate).not.toHaveBeenCalled();
        expect(listClient.setListItemTemplate).not.toHaveBeenCalled();
        expect(listClient.createListDataStream).not.toHaveBeenCalled();
        expect(listClient.createListItemDataStream).not.toHaveBeenCalled();
      });
    });

    describe('template provisioning', () => {
      it('calls setListTemplate when list template does not exist', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListTemplateExists.mockResolvedValue(false);

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(listClient.setListTemplate).toHaveBeenCalledTimes(1);
      });

      it('calls setListTemplate when list data stream does not exist (even if template exists)', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListTemplateExists.mockResolvedValue(true);
        listClient.getListDataStreamExists.mockResolvedValue(false);

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(listClient.setListTemplate).toHaveBeenCalledTimes(1);
      });

      it('skips setListTemplate when both list template and list data stream exist', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListTemplateExists.mockResolvedValue(true);
        listClient.getListDataStreamExists.mockResolvedValue(true);
        listClient.getListItemTemplateExists.mockResolvedValue(true);
        listClient.getListItemDataStreamExists.mockResolvedValue(true);

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(listClient.setListTemplate).not.toHaveBeenCalled();
      });

      it('calls setListItemTemplate when list item template does not exist', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListItemTemplateExists.mockResolvedValue(false);

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(listClient.setListItemTemplate).toHaveBeenCalledTimes(1);
      });

      it('calls setListItemTemplate when list item data stream does not exist (even if template exists)', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListItemTemplateExists.mockResolvedValue(true);
        listClient.getListItemDataStreamExists.mockResolvedValue(false);

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(listClient.setListItemTemplate).toHaveBeenCalledTimes(1);
      });

      it('skips setListItemTemplate when both list item template and list item data stream exist', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListTemplateExists.mockResolvedValue(true);
        listClient.getListItemTemplateExists.mockResolvedValue(true);
        listClient.getListDataStreamExists.mockResolvedValue(true);
        listClient.getListItemDataStreamExists.mockResolvedValue(true);

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(listClient.setListItemTemplate).not.toHaveBeenCalled();
      });
    });

    describe('data stream creation', () => {
      it('creates the list data stream when no existing index', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListIndexExists.mockResolvedValue(false);

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(listClient.createListDataStream).toHaveBeenCalledTimes(1);
        expect(listClient.migrateListIndexToDataStream).not.toHaveBeenCalled();
      });

      it('migrates the list index to a data stream when an existing index is present', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListIndexExists.mockResolvedValue(true);

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(listClient.migrateListIndexToDataStream).toHaveBeenCalledTimes(1);
        expect(listClient.createListDataStream).not.toHaveBeenCalled();
      });

      it('creates the list item data stream when no existing index', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListItemIndexExists.mockResolvedValue(false);

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(listClient.createListItemDataStream).toHaveBeenCalledTimes(1);
        expect(listClient.migrateListItemIndexToDataStream).not.toHaveBeenCalled();
      });

      it('migrates the list item index to a data stream when an existing index is present', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListItemIndexExists.mockResolvedValue(true);

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(listClient.migrateListItemIndexToDataStream).toHaveBeenCalledTimes(1);
        expect(listClient.createListItemDataStream).not.toHaveBeenCalled();
      });

      it('logs a success message after initializing list indices', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();

        await createListIndicesInitializationFlow.provision(buildContext(listClient), logger);

        expect(logger.info).toHaveBeenCalledWith('List indices initialized successfully');
      });
    });

    describe('error handling', () => {
      it('swallows resource_already_exists_exception during list data stream creation', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.createListDataStream.mockRejectedValue(
          new Error('resource_already_exists_exception: index already exists')
        );

        await expect(
          createListIndicesInitializationFlow.provision(buildContext(listClient), logger)
        ).resolves.toEqual({ status: 'ready' });
      });

      it('swallows resource_already_exists_exception during list item data stream creation', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.createListItemDataStream.mockRejectedValue(
          new Error('resource_already_exists_exception: index already exists')
        );

        await expect(
          createListIndicesInitializationFlow.provision(buildContext(listClient), logger)
        ).resolves.toEqual({ status: 'ready' });
      });

      it('swallows resource_already_exists_exception during list index migration', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.getListIndexExists.mockResolvedValue(true);
        listClient.migrateListIndexToDataStream.mockRejectedValue(
          new Error('resource_already_exists_exception: data stream already exists')
        );

        await expect(
          createListIndicesInitializationFlow.provision(buildContext(listClient), logger)
        ).resolves.toEqual({ status: 'ready' });
      });

      it('re-throws non-resource_already_exists errors from list data stream creation', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.createListDataStream.mockRejectedValue(new Error('connection refused'));

        await expect(
          createListIndicesInitializationFlow.provision(buildContext(listClient), logger)
        ).rejects.toThrow('connection refused');
      });

      it('re-throws non-resource_already_exists errors from list item data stream creation', async () => {
        const logger = loggerMock.create();
        const listClient = createMockListClient();
        listClient.createListItemDataStream.mockRejectedValue(new Error('cluster unavailable'));

        await expect(
          createListIndicesInitializationFlow.provision(buildContext(listClient), logger)
        ).rejects.toThrow('cluster unavailable');
      });
    });
  });
});
