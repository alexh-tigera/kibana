/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Middleware } from '.';

export const ensureInstalledMiddleware: Middleware = async (ctx, _req, res) => {
  const entityStoreCtx = await ctx.entityStore;
  const logger = entityStoreCtx.logger.get('ensureInstalledMiddleware');

  try {
    await entityStoreCtx.assetManagerClient.ensureInstalledForAPI();
  } catch (error) {
    logger.error('Failed to auto-install entity store', { error });
    return res.customError({
      statusCode: 500,
      body: {
        message: 'Failed to auto-install entity store before CRUD operation',
      },
    });
  }
};
