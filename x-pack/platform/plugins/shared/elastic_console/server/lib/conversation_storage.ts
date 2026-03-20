/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, InternalIStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '@kbn/agent-builder-server';

const conversationIndexName = chatSystemIndex('conversations');

// Must match agent_builder's conversation storage schema exactly so both plugins
// write to the same concrete index (StorageIndexAdapter hashes the schema).
const storageSettings = {
  name: conversationIndexName,
  schema: {
    properties: {
      user_id: types.keyword({}),
      user_name: types.keyword({}),
      agent_id: types.keyword({}),
      space: types.keyword({}),
      title: types.text({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      conversation_rounds: types.object({ dynamic: false, properties: {} }),
      attachments: types.object({ dynamic: false, properties: {} }),
      state: types.object({ dynamic: false, properties: {} }),
      slack_state: types.object({
        dynamic: false,
        properties: {
          location: types.keyword({}),
          origin_ref: types.keyword({}),
          origin_location: types.keyword({}),
          fork_context: types.text({}),
          connector_id: types.keyword({}),
          located_at: types.date({}),
          handoff_summary: types.text({}),
        },
      }),
    },
  },
} satisfies IndexStorageSettings;

export interface ConversationDocument {
  _id?: string;
  user_id?: string;
  user_name?: string;
  agent_id?: string;
  space?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  conversation_rounds?: unknown[];
  attachments?: unknown[];
  state?: Record<string, unknown>;
  slack_state?: Record<string, unknown>;
}

type ConversationStorageSettings = typeof storageSettings;

export type ConversationStorageClient = InternalIStorageClient<ConversationDocument>;

export const createConversationStorage = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): ConversationStorageClient => {
  const adapter = new StorageIndexAdapter<ConversationStorageSettings, ConversationDocument>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};
