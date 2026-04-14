/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EngineDescriptorClient, EntityStoreGlobalStateClient } from '../saved_objects';
import { ENGINE_STATUS } from '../constants';
import {
  putComponentTemplate,
  putIndexTemplate,
  createIndex,
  deleteIndex,
  createDataStream,
  deleteDataStream,
} from '../../infra/elasticsearch';
import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { getLatestEntityIndexTemplateConfig } from './latest_index_template';
import {
  getLatestEntitiesIndexName,
  getEntitiesAlias,
  ENTITY_LATEST,
} from '../../../common/domain/entity_index';
import {
  getEntityDefinitionComponentTemplate,
  getUpdatesEntityDefinitionComponentTemplate,
} from './component_templates';
import { getHistorySnapshotIndexTemplateConfig } from './history_snapshot_index_template';
import { getUpdatesEntityIndexTemplateConfig } from './updates_index_template';
import { getUpdatesEntitiesDataStreamName } from './updates_data_stream';
import { installLatestIndexIngestPipeline } from './latest_index_ingest_pipeline';

interface SharedElasticsearchAssetOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}

/**
 * Installs all shared Elasticsearch assets that must exist before any index is created:
 * ingest pipeline, component templates (for ALL entity types), and index templates.
 */
export async function installSharedElasticsearchAssets({
  esClient,
  logger,
  namespace,
}: SharedElasticsearchAssetOptions): Promise<void> {
  try {
    await installLatestIndexIngestPipeline(esClient, namespace, logger);
    await installAllComponentTemplates(esClient, namespace, logger);
    await installIndexTemplates(esClient, namespace, logger);
  } catch (error) {
    logger.error(`error installing shared assets in ${namespace}: ${error}`);
    throw error;
  }
}

/**
 * Creates the latest index and updates data stream.
 * Must be called AFTER installSharedElasticsearchAssets to avoid partial mappings.
 */
export async function installIndicesAndDataStreams(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
    (async () => {
      await createIndex(esClient, getLatestEntitiesIndexName(namespace), {
        throwIfExists: false,
        aliases: { [getEntitiesAlias(ENTITY_LATEST, namespace)]: {} },
      });
      logger.debug(`created latest entity index in ${namespace}`);
    })(),

    (async () => {
      await createDataStream(esClient, getUpdatesEntitiesDataStreamName(namespace), {
        throwIfExists: false,
      });
      logger.debug(`created updates entity data stream in ${namespace}`);
    })(),
  ]);
}

async function installIndexTemplates(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
    (async () => {
      await putIndexTemplate(esClient, getLatestEntityIndexTemplateConfig(namespace));
      logger.debug(`installed latest index template in ${namespace}`);
    })(),

    (async () => {
      await putIndexTemplate(esClient, getUpdatesEntityIndexTemplateConfig(namespace));
      logger.debug(`installed updates index template in ${namespace}`);
    })(),

    (async () => {
      await putIndexTemplate(esClient, getHistorySnapshotIndexTemplateConfig(namespace));
      logger.debug(`installed history snapshot index template in ${namespace}`);
    })(),
  ]);
}

async function installAllComponentTemplates(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  const definitions = ALL_ENTITY_TYPES.map((type) => getEntityDefinition(type, namespace));
  await Promise.all(
    definitions.flatMap((definition) => [
      (async () => {
        await putComponentTemplate(
          esClient,
          getEntityDefinitionComponentTemplate(definition, namespace)
        );
        logger.debug(`installed latest component template for: ${definition.type} in ${namespace}`);
      })(),
      (async () => {
        await putComponentTemplate(
          esClient,
          getUpdatesEntityDefinitionComponentTemplate(definition, namespace)
        );
        logger.debug(
          `installed updates component template for: ${definition.type} in ${namespace}`
        );
      })(),
    ])
  );
}

// TODO: add retry
export async function uninstallElasticsearchAssets({
  esClient,
  logger,
  namespace,
}: SharedElasticsearchAssetOptions): Promise<void> {
  try {
    // Only delete indices and data streams.
    // Component templates, index templates, and ingest pipeline are kept intentionally
    // so they are always available for future installs, avoiding mapping race conditions.
    await uninstallIndicesAndDataStreams(esClient, namespace, logger);
  } catch (error) {
    logger.error(`error uninstalling assets: ${error}`);
    // TODO: degrade status?
    throw error;
  }
}

/**
 * Ensures the Entity Store infrastructure exists, installing it in STOPPED
 * state if missing. Called by CRUDClient before write operations to avoid
 * creating unmapped, bare index with alias as its name.
 *
 * Unlike init() (full install + start + task scheduling) or install()
 * (single entity type, sets STARTED), this function:
 *  - Only acts when the concrete latest index does not exist
 *  - Installs shared ES assets, indices, and engine descriptors for ALL types
 *  - Leaves every engine in STOPPED status — no tasks are scheduled
 */
export async function ensureEntityStoreInstalled(deps: {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
  engineDescriptorClient: EngineDescriptorClient;
  globalStateClient: EntityStoreGlobalStateClient;
}): Promise<void> {
  const { esClient, logger, namespace, engineDescriptorClient, globalStateClient } = deps;

  const concreteIndex = getLatestEntitiesIndexName(namespace);
  const exists = await esClient.indices.exists({ index: concreteIndex });
  if (exists) return;

  logger.info('Entity store not installed, auto-installing');

  await Promise.all([
    globalStateClient.init(),
    installSharedElasticsearchAssets({ esClient, logger, namespace }),
  ]);

  await installIndicesAndDataStreams(esClient, namespace, logger);

  // init() creates SO with INSTALLING status (just a data record, no tasks start).
  // update() then sets it to STOPPED. No engine actually runs at any point.
  for (const type of ALL_ENTITY_TYPES) {
    try {
      await engineDescriptorClient.init(type);
      await engineDescriptorClient.update(type, { status: ENGINE_STATUS.STOPPED });
    } catch (error) {
      if (SavedObjectsErrorHelpers.isBadRequestError(error)) continue;
      throw error;
    }
  }
}

async function uninstallIndicesAndDataStreams(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
    (async () => {
      await deleteIndex(esClient, getLatestEntitiesIndexName(namespace));
      logger.debug(`deleted entity index`);
    })(),
    (async () => {
      await deleteDataStream(esClient, getUpdatesEntitiesDataStreamName(namespace));
      logger.debug(`deleted entity updates data stream`);
    })(),
  ]);
}
