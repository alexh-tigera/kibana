/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  ElasticConsolePluginSetup,
  ElasticConsolePluginStart,
  ElasticConsoleSetupDependencies,
  ElasticConsoleStartDependencies,
} from './types';
import type { ElasticConsoleConfig } from './config';
import { SLACK_CREDENTIALS_SO_TYPE } from './lib/slack_credentials_so';
import { registerUiSettings } from './ui_settings';
import { registerRoutes } from './routes';

export class ElasticConsolePlugin
  implements
    Plugin<
      ElasticConsolePluginSetup,
      ElasticConsolePluginStart,
      ElasticConsoleSetupDependencies,
      ElasticConsoleStartDependencies
    >
{
  private logger: Logger;
  private config: ElasticConsoleConfig;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.config = context.config.get<ElasticConsoleConfig>();
  }

  setup(
    coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>,
    setupDeps: ElasticConsoleSetupDependencies
  ): ElasticConsolePluginSetup {
    // Register the saved object type for Slack credentials (bot token)
    coreSetup.savedObjects.registerType({
      name: SLACK_CREDENTIALS_SO_TYPE,
      hidden: true,
      namespaceType: 'agnostic', // global singleton — one per Kibana instance
      mappings: {
        dynamic: false,
        properties: {
          bot_token: { type: 'binary' }, // encrypted at rest by ESO
          updated_at: { type: 'date' },
        },
      },
    });

    // Tell ESO which attributes to encrypt
    setupDeps.encryptedSavedObjects.registerType({
      type: SLACK_CREDENTIALS_SO_TYPE,
      attributesToEncrypt: new Set(['bot_token']),
    });

    registerUiSettings(coreSetup);

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
      cloud: setupDeps.cloud,
      config: this.config,
    });

    return {};
  }

  start(_core: CoreStart): ElasticConsolePluginStart {
    return {};
  }

  stop() {}
}
