/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';

const DATA_VIEW_TIME_FIELD = '@timestamp';

export const installDataView = async (
  currentSpaceId: string,
  dataViewsService: DataViewsService,
  dataViewName: string,
  indexPattern: string,
  dataViewId: string,
  logger: Logger,
  /**
   * When provided, used as the full data view title instead of the default
   * `${indexPattern}${currentSpaceId}` construction. Use this for Entity Store V2
   * index patterns that already embed the space ID (e.g. `.entities.v2.latest.security_default-*`).
   */
  titleOverride?: string
) => {
  try {
    const currentSpaceDataViewId = `${dataViewId}-${currentSpaceId}`;
    const title = titleOverride ?? `${indexPattern}${currentSpaceId}`;

    logger.info(`Creating and saving data view with ID: ${currentSpaceDataViewId}`);

    return await dataViewsService.createAndSave(
      {
        id: currentSpaceDataViewId,
        title,
        name: `${dataViewName} - ${currentSpaceId}`,
        namespaces: [currentSpaceId],
        allowNoIndex: true,
        timeFieldName: DATA_VIEW_TIME_FIELD,
        allowHidden: true,
      },
      false,
      true
    );
  } catch (error) {
    logger.error(`Failed to setup data view`, error);
    throw error;
  }
};
