/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { Logger } from '@kbn/logging';
import type {
  GetUiSettingsContext,
  UiSettingsParams,
  UserProvidedValues,
} from '@kbn/core-ui-settings-common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { ValidationBadValueError, ValidationSettingNotFoundError } from '../ui_settings_errors';
import type { PerSettingCache } from '../per_setting_cache';

export interface BaseUiSettingsDefaultsClientOptions {
  overrides?: Record<string, any>;
  defaults?: Record<string, UiSettingsParams>;
  log: Logger;
  perSettingCache?: PerSettingCache;
  namespace?: string;
}

/**
 * Base implementation of the {@link IUiSettingsClient}.
 */
export abstract class BaseUiSettingsClient implements IUiSettingsClient {
  protected readonly defaults: Record<string, UiSettingsParams>;
  protected readonly overrides: Record<string, any>;
  protected readonly log: Logger;
  protected readonly perSettingCache?: PerSettingCache;
  protected readonly namespace: string;

  protected constructor(options: BaseUiSettingsDefaultsClientOptions) {
    const { defaults = {}, overrides = {}, log, perSettingCache, namespace = 'default' } = options;
    this.log = log;
    this.overrides = overrides;
    this.defaults = defaults;
    this.perSettingCache = perSettingCache;
    this.namespace = namespace;
  }

  getRegistered() {
    const copiedDefaults: Record<string, Omit<UiSettingsParams, 'schema'>> = {};
    for (const [key, value] of Object.entries(this.defaults)) {
      copiedDefaults[key] = omit(value, 'schema');
    }
    return copiedDefaults;
  }

  async get<T = any>(key: string, context?: GetUiSettingsContext): Promise<T> {
    const definition = this.defaults[key];

    const isCacheable =
      this.perSettingCache &&
      definition?.cacheTTL &&
      definition.cacheTTL > 0 &&
      !this.isOverridden(key);

    if (isCacheable) {
      const cached = this.perSettingCache.get<T>(this.namespace, key);
      if (cached !== null) {
        return cached;
      }
    }

    // Cache miss or not cacheable - get all settings
    const all = await this.getAll(context);
    const value = all[key] as T;

    // Cache the final merged value if cacheable
    if (isCacheable) {
      this.perSettingCache.set(this.namespace, key, value, definition.cacheTTL!);
    }

    return value;
  }

  async getAll<T = any>(context?: GetUiSettingsContext) {
    const defaultValues = await this.getDefaultValues(context);
    const result = { ...defaultValues };

    const userProvided = await this.getUserProvided();
    Object.keys(userProvided).forEach((key) => {
      if (userProvided[key].userValue !== undefined) {
        result[key] = userProvided[key].userValue;
      }
    });

    return Object.freeze(result) as Record<string, T>;
  }

  isOverridden(key: string) {
    return Object.hasOwn(this.overrides, key);
  }

  isSensitive(key: string): boolean {
    const definition = this.defaults[key];
    return !!definition?.sensitive;
  }

  async validate(key: string, value: unknown) {
    if (value == null) {
      throw new ValidationBadValueError();
    }
    const definition = this.defaults[key];
    if (!definition) {
      throw new ValidationSettingNotFoundError(key);
    }
    if (definition.schema) {
      try {
        definition.schema.validate(value);
      } catch (error) {
        return { valid: false, errorMessage: error.message };
      }
    }
    return { valid: true };
  }

  protected validateKey(key: string, value: unknown) {
    const definition = this.defaults[key];
    if (value === null || definition === undefined) return;
    if (definition.schema) {
      definition.schema.validate(value, {}, `validation [${key}]`);
    }
  }

  private async getDefaultValues(context?: GetUiSettingsContext) {
    const values: { [key: string]: unknown } = {};
    const promises: Array<[string, Promise<unknown>]> = [];

    for (const [key, definition] of Object.entries(this.defaults)) {
      if (definition.getValue) {
        promises.push([key, definition.getValue(context)]);
      } else {
        values[key] = definition.value;
      }
    }

    await Promise.all(
      promises.map(([key, promise]) =>
        promise
          .then((value) => {
            values[key] = value;
          })
          .catch((error) => {
            this.log.error(`[UiSettingsClient] Failed to get value for key "${key}": ${error}`);
            // Fallback to `value` prop if `getValue()` fails
            values[key] = this.defaults[key].value;
          })
      )
    );

    return values;
  }

  /**
   * Gets user-provided values.
   *
   * If settingKey is included, it specifies a particular requested setting. If provided, the implementation can choose to optimize
   * for returning the user value of that single setting (e.g. by checking a per-setting cache) rather than having to build the full record of all user values.
   */
  abstract getUserProvided<T = any>(
    settingKey?: string
  ): Promise<Record<string, UserProvidedValues<T>>>;

  abstract setMany(changes: Record<string, any>): Promise<void>;

  abstract set(key: string, value: any): Promise<void>;

  abstract remove(key: string): Promise<void>;

  abstract removeMany(keys: string[]): Promise<void>;
}
