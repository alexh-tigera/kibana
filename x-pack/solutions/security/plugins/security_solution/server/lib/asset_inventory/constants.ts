/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Entity Store V1 index pattern (used when FF_ENABLE_ENTITY_STORE_V2 is disabled).
// Space ID is appended to this prefix at runtime: `${ASSET_INVENTORY_INDEX_PATTERN}${spaceId}`.
export const ASSET_INVENTORY_INDEX_PATTERN = '.entities.*.latest.security_*_';
export const ASSET_INVENTORY_DATA_VIEW_ID_PREFIX = 'asset-inventory';
export const ASSET_INVENTORY_DATA_VIEW_NAME = 'Asset Inventory Data View';

// For Asset Inventory onboarding, the Generic Entities should be initialized with a lookback period of 26 hours
// to account for the fact that entity extraction integrations have a default ingest window time of 24 hours
// and we want to cover the ingest window time with a buffer of 2 hours.
export const ASSET_INVENTORY_GENERIC_LOOKBACK_PERIOD = '26h';
