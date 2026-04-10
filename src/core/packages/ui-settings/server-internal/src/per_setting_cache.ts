/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Cache entry for a single UI setting
 * @internal
 */
interface PerSettingCacheEntry<T = unknown> {
  value: T;
  timer: NodeJS.Timeout;
}

/**
 * Shared per-setting cache for UI settings with configurable TTLs.
 * Cache keys are in the format: `{namespace}:{settingKey}`
 *
 * Includes request deduplication to prevent thundering herd when multiple
 * concurrent requests are made for the same uncached setting.
 *
 * @internal
 */
export class PerSettingCache {
  private readonly entries = new Map<string, PerSettingCacheEntry>();
  private readonly inflightRequests = new Map<string, Promise<unknown>>();

  /**
   * Get cached value for a specific namespace:key combination
   */
  get<T = unknown>(namespace: string, key: string): T | null {
    const cacheKey = `${namespace}:${key}`;
    const entry = this.entries.get(cacheKey);
    return entry ? (entry.value as T) : null;
  }

  /**
   * Get in-flight promise for a specific namespace:key combination.
   * Used for request deduplication.
   */
  getInflight<T = unknown>(namespace: string, key: string): Promise<T> | null {
    const cacheKey = `${namespace}:${key}`;
    const promise = this.inflightRequests.get(cacheKey);
    return promise ? (promise as Promise<T>) : null;
  }

  /**
   * Set in-flight promise for a specific namespace:key combination.
   * The promise is automatically removed when it resolves or rejects.
   */
  setInflight<T = unknown>(namespace: string, key: string, promise: Promise<T>): void {
    const cacheKey = `${namespace}:${key}`;
    this.inflightRequests.set(cacheKey, promise);

    // Auto-cleanup when promise settles
    promise
      .then(() => {
        this.inflightRequests.delete(cacheKey);
      })
      .catch(() => {
        this.inflightRequests.delete(cacheKey);
      });
  }

  /**
   * Set cached value with TTL
   */
  set<T = unknown>(namespace: string, key: string, value: T, ttl: number): void {
    const cacheKey = `${namespace}:${key}`;
    this.del(namespace, key); // Clear existing timer

    const timer = setTimeout(() => {
      this.entries.delete(cacheKey);
    }, ttl);

    this.entries.set(cacheKey, { value, timer });
  }

  /**
   * Delete cached value and clear any in-flight promises.
   * This ensures cache invalidation also prevents stale in-flight requests.
   */
  del(namespace: string, key: string): void {
    const cacheKey = `${namespace}:${key}`;

    // Clear cached value
    const entry = this.entries.get(cacheKey);
    if (entry) {
      clearTimeout(entry.timer);
      this.entries.delete(cacheKey);
    }

    // Clear in-flight promise to prevent stale data
    this.inflightRequests.delete(cacheKey);
  }

  /**
   * Delete all cached values and in-flight promises for a namespace
   */
  delNamespace(namespace: string): void {
    const prefix = `${namespace}:`;

    // Clear cached values
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        const entry = this.entries.get(key);
        if (entry) {
          clearTimeout(entry.timer);
        }
        this.entries.delete(key);
      }
    }

    // Clear in-flight promises
    for (const key of this.inflightRequests.keys()) {
      if (key.startsWith(prefix)) {
        this.inflightRequests.delete(key);
      }
    }
  }

  /**
   * Clear all cached values and in-flight promises
   */
  clear(): void {
    for (const entry of this.entries.values()) {
      clearTimeout(entry.timer);
    }
    this.entries.clear();
    this.inflightRequests.clear();
  }

  /**
   * Check if a namespace:key has a cached value
   */
  has(namespace: string, key: string): boolean {
    return this.entries.has(`${namespace}:${key}`);
  }
}
