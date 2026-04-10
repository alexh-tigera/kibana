/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PerSettingCache } from './per_setting_cache';

describe('PerSettingCache', () => {
  let cache: PerSettingCache;

  beforeEach(() => {
    cache = new PerSettingCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cache.clear();
    jest.useRealTimers();
  });

  describe('get/set', () => {
    it('stores and retrieves values', () => {
      cache.set('default', 'key1', 'value1', 5000);
      expect(cache.get('default', 'key1')).toBe('value1');
    });

    it('returns null for non-existent keys', () => {
      expect(cache.get('default', 'nonexistent')).toBeNull();
    });

    it('supports different value types', () => {
      cache.set('default', 'string', 'text', 5000);
      cache.set('default', 'number', 42, 5000);
      cache.set('default', 'object', { foo: 'bar' }, 5000);
      cache.set('default', 'array', [1, 2, 3], 5000);

      expect(cache.get('default', 'string')).toBe('text');
      expect(cache.get('default', 'number')).toBe(42);
      expect(cache.get('default', 'object')).toEqual({ foo: 'bar' });
      expect(cache.get('default', 'array')).toEqual([1, 2, 3]);
    });
  });

  describe('TTL expiry', () => {
    it('removes entries after TTL expires', () => {
      cache.set('default', 'key1', 'value1', 1000);
      expect(cache.get('default', 'key1')).toBe('value1');

      jest.advanceTimersByTime(1000);
      expect(cache.get('default', 'key1')).toBeNull();
    });

    it('does not expire before TTL', () => {
      cache.set('default', 'key1', 'value1', 1000);
      expect(cache.get('default', 'key1')).toBe('value1');

      jest.advanceTimersByTime(999);
      expect(cache.get('default', 'key1')).toBe('value1');
    });

    it('handles different TTLs for different keys', () => {
      cache.set('default', 'key1', 'value1', 1000);
      cache.set('default', 'key2', 'value2', 2000);

      jest.advanceTimersByTime(1000);
      expect(cache.get('default', 'key1')).toBeNull();
      expect(cache.get('default', 'key2')).toBe('value2');

      jest.advanceTimersByTime(1000);
      expect(cache.get('default', 'key2')).toBeNull();
    });
  });

  describe('namespace isolation', () => {
    it('isolates values by namespace', () => {
      cache.set('space1', 'key1', 'value1', 5000);
      cache.set('space2', 'key1', 'value2', 5000);

      expect(cache.get('space1', 'key1')).toBe('value1');
      expect(cache.get('space2', 'key1')).toBe('value2');
    });

    it('does not return values from different namespaces', () => {
      cache.set('space1', 'key1', 'value1', 5000);
      expect(cache.get('space2', 'key1')).toBeNull();
    });
  });

  describe('del', () => {
    it('deletes a specific key', () => {
      cache.set('default', 'key1', 'value1', 5000);
      cache.set('default', 'key2', 'value2', 5000);

      cache.del('default', 'key1');

      expect(cache.get('default', 'key1')).toBeNull();
      expect(cache.get('default', 'key2')).toBe('value2');
    });

    it('clears the timer when deleting', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      cache.set('default', 'key1', 'value1', 5000);
      cache.del('default', 'key1');

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('handles deleting non-existent keys', () => {
      expect(() => cache.del('default', 'nonexistent')).not.toThrow();
    });

    it('respects namespace when deleting', () => {
      cache.set('space1', 'key1', 'value1', 5000);
      cache.set('space2', 'key1', 'value2', 5000);

      cache.del('space1', 'key1');

      expect(cache.get('space1', 'key1')).toBeNull();
      expect(cache.get('space2', 'key1')).toBe('value2');
    });
  });

  describe('delNamespace', () => {
    it('deletes all keys in a namespace', () => {
      cache.set('space1', 'key1', 'value1', 5000);
      cache.set('space1', 'key2', 'value2', 5000);
      cache.set('space2', 'key1', 'value3', 5000);

      cache.delNamespace('space1');

      expect(cache.get('space1', 'key1')).toBeNull();
      expect(cache.get('space1', 'key2')).toBeNull();
      expect(cache.get('space2', 'key1')).toBe('value3');
    });

    it('clears all timers for the namespace', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      cache.set('space1', 'key1', 'value1', 5000);
      cache.set('space1', 'key2', 'value2', 5000);

      cache.delNamespace('space1');

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });

    it('handles deleting non-existent namespaces', () => {
      expect(() => cache.delNamespace('nonexistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('removes all cached entries', () => {
      cache.set('space1', 'key1', 'value1', 5000);
      cache.set('space2', 'key2', 'value2', 5000);

      cache.clear();

      expect(cache.get('space1', 'key1')).toBeNull();
      expect(cache.get('space2', 'key2')).toBeNull();
    });

    it('clears all timers', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      cache.set('space1', 'key1', 'value1', 5000);
      cache.set('space2', 'key2', 'value2', 5000);

      cache.clear();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('has', () => {
    it('returns true for existing keys', () => {
      cache.set('default', 'key1', 'value1', 5000);
      expect(cache.has('default', 'key1')).toBe(true);
    });

    it('returns false for non-existent keys', () => {
      expect(cache.has('default', 'nonexistent')).toBe(false);
    });

    it('respects namespace', () => {
      cache.set('space1', 'key1', 'value1', 5000);
      expect(cache.has('space1', 'key1')).toBe(true);
      expect(cache.has('space2', 'key1')).toBe(false);
    });

    it('returns false after TTL expires', () => {
      cache.set('default', 'key1', 'value1', 1000);
      expect(cache.has('default', 'key1')).toBe(true);

      jest.advanceTimersByTime(1000);
      expect(cache.has('default', 'key1')).toBe(false);
    });
  });

  describe('updating existing entries', () => {
    it('replaces value and resets timer when setting existing key', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      cache.set('default', 'key1', 'value1', 5000);
      cache.set('default', 'key1', 'value2', 3000);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(cache.get('default', 'key1')).toBe('value2');

      jest.advanceTimersByTime(3000);
      expect(cache.get('default', 'key1')).toBeNull();
    });
  });
});
