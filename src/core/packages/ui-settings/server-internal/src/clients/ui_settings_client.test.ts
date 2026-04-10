/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Chance from 'chance';
import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { mockCreateOrUpgradeSavedConfig } from './ui_settings_client.test.mock';
import { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { UiSettingsClient } from './ui_settings_client';
import {
  CannotOverrideError,
  ValidationBadValueError,
  ValidationSettingNotFoundError,
} from '../ui_settings_errors';
import { PerSettingCache } from '../per_setting_cache';

const logger = loggingSystemMock.create().get();

const TYPE = 'config';
const ID = 'kibana-version';
const BUILD_NUM = 1234;
const chance = new Chance();

interface SetupOptions {
  defaults?: Record<string, any>;
  esDocSource?: Record<string, any>;
  overrides?: Record<string, any>;
  namespace?: string;
  perSettingCache?: PerSettingCache;
}

describe('ui settings', () => {
  function setup(options: SetupOptions = {}) {
    const {
      defaults = {},
      overrides = {},
      esDocSource = {},
      namespace = 'default',
      perSettingCache = new PerSettingCache(),
    } = options;

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockReturnValue({ attributes: esDocSource } as any);

    const uiSettings = new UiSettingsClient({
      type: TYPE,
      id: ID,
      buildNum: BUILD_NUM,
      defaults,
      savedObjectsClient,
      overrides,
      log: logger,
      perSettingCache,
      namespace,
    });

    return {
      uiSettings,
      savedObjectsClient,
      perSettingCache,
    };
  }

  afterEach(() => jest.clearAllMocks());

  describe('#setMany()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.setMany({ a: 'b' })).toBeInstanceOf(Promise);
    });

    it('updates a single value in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.setMany({ one: 'value' });

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        { one: 'value' },
        { refresh: false }
      );
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.setMany({ one: 'value', another: 'val' });

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        {
          one: 'value',
          another: 'val',
        },
        { refresh: false }
      );
    });

    it('automatically creates the savedConfig if it is missing', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      savedObjectsClient.update
        .mockRejectedValueOnce(SavedObjectsClient.errors.createGenericNotFoundError())
        .mockResolvedValueOnce({} as any);

      await uiSettings.setMany({ foo: 'bar' });

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(2);
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledTimes(1);
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledWith(
        expect.objectContaining({ handleWriteErrors: false })
      );
    });

    it('only tried to auto create once and throws NotFound', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      savedObjectsClient.update.mockRejectedValue(
        SavedObjectsClient.errors.createGenericNotFoundError()
      );

      try {
        await uiSettings.setMany({ foo: 'bar' });
        throw new Error('expected setMany to throw a NotFound error');
      } catch (error) {
        expect(SavedObjectsClient.errors.isNotFoundError(error)).toBe(true);
      }

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(2);
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledTimes(1);
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledWith(
        expect.objectContaining({ handleWriteErrors: false })
      );
    });

    it('throws CannotOverrideError if the key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar',
        },
      });

      try {
        await uiSettings.setMany({
          bar: 'box',
          foo: 'baz',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(CannotOverrideError);
        expect(error.message).toBe('Unable to update "foo" because it is overridden');
      }
    });

    it('validates value if a schema presents', async () => {
      const defaults = { foo: { schema: schema.string() } };
      const { uiSettings, savedObjectsClient } = setup({ defaults });

      await expect(
        uiSettings.setMany({
          bar: 2,
          foo: 1,
        })
      ).rejects.toMatchInlineSnapshot(
        `[Error: [validation [foo]]: expected value of type [string] but got [number]]`
      );

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(0);
    });
  });

  describe('#set()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.set('a', 'b')).toBeInstanceOf(Promise);
    });

    it('updates single values by (key, value)', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.set('one', 'value');

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        {
          one: 'value',
        },
        { refresh: false }
      );
    });

    it('validates value if a schema presents', async () => {
      const defaults = { foo: { schema: schema.string() } };
      const { uiSettings, savedObjectsClient } = setup({ defaults });

      await expect(uiSettings.set('foo', 1)).rejects.toMatchInlineSnapshot(
        `[Error: [validation [foo]]: expected value of type [string] but got [number]]`
      );

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(0);
    });

    it('throws CannotOverrideError if the key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar',
        },
      });

      try {
        await uiSettings.set('foo', 'baz');
      } catch (error) {
        expect(error).toBeInstanceOf(CannotOverrideError);
        expect(error.message).toBe('Unable to update "foo" because it is overridden');
      }
    });
  });

  describe('#remove()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.remove('one')).toBeInstanceOf(Promise);
    });

    it('removes single values by key', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.remove('one');

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        { one: null },
        { refresh: false }
      );
    });

    it('does not fail validation', async () => {
      const defaults = {
        foo: {
          schema: schema.string(),
          value: '1',
        },
      };
      const { uiSettings, savedObjectsClient } = setup({ defaults });

      await uiSettings.remove('foo');

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    });

    it('throws CannotOverrideError if the key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar',
        },
      });

      try {
        await uiSettings.remove('foo');
      } catch (error) {
        expect(error).toBeInstanceOf(CannotOverrideError);
        expect(error.message).toBe('Unable to update "foo" because it is overridden');
      }
    });
  });

  describe('#removeMany()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.removeMany(['one'])).toBeInstanceOf(Promise);
    });

    it('removes a single value', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.removeMany(['one']);

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        { one: null },
        { refresh: false }
      );
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.removeMany(['one', 'two', 'three']);

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        {
          one: null,
          two: null,
          three: null,
        },
        { refresh: false }
      );
    });

    it('does not fail validation', async () => {
      const defaults = {
        foo: {
          schema: schema.string(),
          value: '1',
        },
      };
      const { uiSettings, savedObjectsClient } = setup({ defaults });

      await uiSettings.removeMany(['foo', 'bar']);

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    });

    it('throws CannotOverrideError if any key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar',
        },
      });

      try {
        await uiSettings.setMany({ baz: 'baz', foo: 'foo' });
      } catch (error) {
        expect(error).toBeInstanceOf(CannotOverrideError);
        expect(error.message).toBe('Unable to update "foo" because it is overridden');
      }
    });
  });

  describe('#getRegistered()', () => {
    it('returns the registered settings passed to the constructor', () => {
      const value = chance.word();
      const defaults = { key: { value } };
      const { uiSettings } = setup({ defaults });
      expect(uiSettings.getRegistered()).toEqual(defaults);
    });
    it('does not leak validation schema outside', () => {
      const value = chance.word();
      const defaults = { key: { value, schema: schema.string() } };
      const { uiSettings } = setup({ defaults });
      expect(uiSettings.getRegistered()).toStrictEqual({ key: { value } });
    });
  });

  describe('#getUserProvided()', () => {
    it('pulls user configuration from ES', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.getUserProvided();

      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.get).toHaveBeenCalledWith(TYPE, ID);
    });

    it('returns user configuration', async () => {
      const esDocSource = { user: 'customized' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided();

      expect(result).toStrictEqual({
        user: {
          userValue: 'customized',
        },
      });
    });

    it('ignores null user configuration (because default values)', async () => {
      const esDocSource = { user: 'customized', usingDefault: null, something: 'else' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided();

      expect(result).toStrictEqual({
        user: {
          userValue: 'customized',
        },
        something: {
          userValue: 'else',
        },
      });
    });

    it('ignores user-configured value if it fails validation', async () => {
      const esDocSource = { user: 'foo', id: 'bar' };
      const defaults = {
        id: {
          value: 42,
          schema: schema.number(),
        },
      };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.getUserProvided();

      expect(result).toStrictEqual({
        user: {
          userValue: 'foo',
        },
      });

      expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
        Array [
          Array [
            "Ignore invalid UiSettings value. Error: [validation [id]]: expected value of type [number] but got [string].",
          ],
        ]
      `);
    });

    it('automatically creates the savedConfig if it is missing and returns empty object', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      savedObjectsClient.get = jest
        .fn()
        .mockRejectedValueOnce(SavedObjectsClient.errors.createGenericNotFoundError())
        .mockResolvedValueOnce({ attributes: {} });

      expect(await uiSettings.getUserProvided()).toStrictEqual({});

      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);

      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledTimes(1);
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledWith(
        expect.objectContaining({ handleWriteErrors: true })
      );
    });

    it('returns result of savedConfig creation in case of notFound error', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      mockCreateOrUpgradeSavedConfig.mockResolvedValue({ foo: 'bar ' });
      savedObjectsClient.get.mockRejectedValue(
        SavedObjectsClient.errors.createGenericNotFoundError()
      );

      expect(await uiSettings.getUserProvided()).toStrictEqual({ foo: { userValue: 'bar ' } });
    });

    it('returns an empty object on Forbidden responses', async () => {
      const { uiSettings, savedObjectsClient } = setup();

      const error = SavedObjectsClient.errors.decorateForbiddenError(new Error());
      savedObjectsClient.get.mockRejectedValue(error);

      expect(await uiSettings.getUserProvided()).toStrictEqual({});
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledTimes(0);
    });

    it('returns an empty object on EsUnavailable responses', async () => {
      const { uiSettings, savedObjectsClient } = setup();

      const error = SavedObjectsClient.errors.decorateEsUnavailableError(new Error());
      savedObjectsClient.get.mockRejectedValue(error);

      expect(await uiSettings.getUserProvided()).toStrictEqual({});
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledTimes(0);
    });

    it('throws Unauthorized errors', async () => {
      const { uiSettings, savedObjectsClient } = setup();

      const error = SavedObjectsClient.errors.decorateNotAuthorizedError(new Error());
      savedObjectsClient.get.mockRejectedValue(error);

      try {
        await uiSettings.getUserProvided();
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it('throw when SavedObjectsClient throws in some unexpected way', async () => {
      const { uiSettings, savedObjectsClient } = setup();

      const error = new Error('unexpected');
      savedObjectsClient.get.mockRejectedValue(error);

      try {
        await uiSettings.getUserProvided();
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it('includes overridden values for overridden keys', async () => {
      const esDocSource = {
        user: 'customized',
      };

      const overrides = {
        foo: 'bar',
        baz: null,
      };

      const { uiSettings } = setup({ esDocSource, overrides });
      expect(await uiSettings.getUserProvided()).toStrictEqual({
        user: {
          userValue: 'customized',
        },
        foo: {
          userValue: 'bar',
          isOverridden: true,
        },
        baz: { isOverridden: true },
      });
    });
  });

  describe('#getAll()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, savedObjectsClient } = setup({ esDocSource });
      await uiSettings.getAll();
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.get).toHaveBeenCalledWith(TYPE, ID);
    });

    it('returns defaults when es doc is empty', async () => {
      const esDocSource = {};
      const defaults = { foo: { value: 'bar' } };
      const { uiSettings } = setup({ esDocSource, defaults });
      expect(await uiSettings.getAll()).toStrictEqual({
        foo: 'bar',
      });
    });

    it('ignores user-configured value if it fails validation', async () => {
      const esDocSource = { user: 'foo', id: 'bar' };
      const defaults = {
        id: {
          value: 42,
          schema: schema.number(),
        },
      };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.getAll();

      expect(result).toStrictEqual({
        id: 42,
        user: 'foo',
      });

      expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
        Array [
          Array [
            "Ignore invalid UiSettings value. Error: [validation [id]]: expected value of type [number] but got [string].",
          ],
        ]
      `);
    });

    it(`merges user values, including ones without defaults, into key value pairs`, async () => {
      const esDocSource = {
        foo: 'user-override',
        bar: 'user-provided',
      };

      const defaults = {
        foo: {
          value: 'default',
        },
      };

      const { uiSettings } = setup({ esDocSource, defaults });

      expect(await uiSettings.getAll()).toStrictEqual({
        foo: 'user-override',
        bar: 'user-provided',
      });
    });

    it('includes the values for overridden keys', async () => {
      const esDocSource = {
        foo: 'user-override',
        bar: 'user-provided',
      };

      const defaults = {
        foo: {
          value: 'default',
        },
      };

      const overrides = {
        foo: 'bax',
      };

      const { uiSettings } = setup({ esDocSource, defaults, overrides });

      expect(await uiSettings.getAll()).toStrictEqual({
        foo: 'bax',
        bar: 'user-provided',
      });
    });

    it('throws if mutates the result of getAll()', async () => {
      const { uiSettings } = setup({ esDocSource: {} });
      const result = await uiSettings.getAll();

      expect(() => {
        result.foo = 'bar';
      }).toThrow();
    });
  });

  describe('#get()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, savedObjectsClient } = setup({ esDocSource });
      await uiSettings.get('any');

      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.get).toHaveBeenCalledWith(TYPE, ID);
    });

    it(`returns the promised value for a key`, async () => {
      const esDocSource = {};
      const defaults = { dateFormat: { value: chance.word() } };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.get('dateFormat');

      expect(result).toBe(defaults.dateFormat.value);
    });

    it(`returns the user-configured value for a custom key`, async () => {
      const esDocSource = { custom: 'value' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.get('custom');

      expect(result).toBe('value');
    });

    it(`returns the user-configured value for a modified key`, async () => {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.get('dateFormat');
      expect(result).toBe('YYYY-MM-DD');
    });

    it('returns the overridden value for an overriden key', async () => {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const overrides = { dateFormat: 'foo' };
      const { uiSettings } = setup({ esDocSource, overrides });

      expect(await uiSettings.get('dateFormat')).toBe('foo');
    });

    it('returns the default value for an override with value null', async () => {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const overrides = { dateFormat: null };
      const defaults = { dateFormat: { value: 'foo' } };
      const { uiSettings } = setup({ esDocSource, overrides, defaults });

      expect(await uiSettings.get('dateFormat')).toBe('foo');
    });

    it('returns the overridden value if the document does not exist', async () => {
      const overrides = { dateFormat: 'foo' };
      const { uiSettings, savedObjectsClient } = setup({ overrides });
      savedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsClient.errors.createGenericNotFoundError()
      );

      expect(await uiSettings.get('dateFormat')).toBe('foo');
    });

    it('returns the default value if user-configured value fails validation', async () => {
      const esDocSource = { id: 'bar' };
      const defaults = {
        id: {
          value: 42,
          schema: schema.number(),
        },
      };

      const { uiSettings } = setup({ esDocSource, defaults });

      expect(await uiSettings.get('id')).toBe(42);

      expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
        Array [
          Array [
            "Ignore invalid UiSettings value. Error: [validation [id]]: expected value of type [number] but got [string].",
          ],
        ]
      `);
    });
  });

  describe('#isSensitive()', () => {
    it('returns false if sensitive config is not set', () => {
      const defaults = {
        foo: {
          schema: schema.string(),
          value: '1',
        },
      };

      const { uiSettings } = setup({ defaults });
      expect(uiSettings.isSensitive('foo')).toBe(false);
    });

    it('returns false if key is not in the settings', () => {
      const { uiSettings } = setup();
      expect(uiSettings.isSensitive('baz')).toBe(false);
    });

    it('returns true if overrides defined and key is overridden', () => {
      const defaults = {
        foo: {
          schema: schema.string(),
          sensitive: true,
          value: '1',
        },
      };

      const { uiSettings } = setup({ defaults });
      expect(uiSettings.isSensitive('foo')).toBe(true);
    });
  });

  describe('#isOverridden()', () => {
    it('returns false if no overrides defined', () => {
      const { uiSettings } = setup();
      expect(uiSettings.isOverridden('foo')).toBe(false);
    });

    it('returns false if overrides defined but key is not included', () => {
      const { uiSettings } = setup({ overrides: { foo: true, bar: true } });
      expect(uiSettings.isOverridden('baz')).toBe(false);
    });

    it('returns false for object prototype properties', () => {
      const { uiSettings } = setup({ overrides: { foo: true, bar: true } });
      expect(uiSettings.isOverridden('hasOwnProperty')).toBe(false);
    });

    it('returns true if overrides defined and key is overridden', () => {
      const { uiSettings } = setup({ overrides: { foo: true, bar: true } });
      expect(uiSettings.isOverridden('bar')).toBe(true);
    });
  });

  describe('#validate()', () => {
    it('returns a correct validation response for an existing setting key and an invalid value', async () => {
      const defaults = { foo: { schema: schema.number() } };
      const { uiSettings } = setup({ defaults });

      expect(await uiSettings.validate('foo', 'testValue')).toMatchObject({
        valid: false,
        errorMessage: 'expected value of type [number] but got [string]',
      });
    });

    it('returns a correct validation response for an existing setting key and a valid value', async () => {
      const defaults = { foo: { schema: schema.number() } };
      const { uiSettings } = setup({ defaults });

      expect(await uiSettings.validate('foo', 5)).toMatchObject({ valid: true });
    });

    it('throws for a non-existing setting key', async () => {
      const { uiSettings } = setup();

      try {
        await uiSettings.validate('bar', 5);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationSettingNotFoundError);
        expect(error.message).toBe('Setting with a key [bar] does not exist.');
      }
    });

    it('throws for a null value', async () => {
      const defaults = { foo: { schema: schema.number() } };
      const { uiSettings } = setup({ defaults });

      try {
        await uiSettings.validate('foo', null);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationBadValueError);
        expect(error.message).toBe('No value was specified.');
      }
    });
  });

  describe('caching', () => {
    describe('read operations cache user config', () => {
      beforeEach(() => {
        jest.useFakeTimers({ legacyFakeTimers: true });
      });

      afterEach(() => {
        jest.clearAllTimers();
      });

      it('get', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.get('any');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(10000);
        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('getAll', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.getAll();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.getAll();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(10000);
        await uiSettings.getAll();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('getUserProvided', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(10000);
        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });
    });

    describe('write operations invalidate user config cache', () => {
      it('set', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.get('any');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.set('foo', 'bar');
        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('setMany', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.get('any');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.setMany({ foo: 'bar' });
        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('remove', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.get('any');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.remove('foo');
        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('removeMany', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.get('any');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.removeMany(['foo', 'bar']);
        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('per-setting cache in get() method', () => {
    beforeEach(() => {
      jest.useFakeTimers({ legacyFakeTimers: true });
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('caches final merged value on get() and returns from cache on subsequent calls', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'user-value' };
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      // First get() should fetch from ES
      const value1 = await uiSettings.get('foo');
      expect(value1).toBe('user-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // Second get() should use cache and not hit ES
      const value2 = await uiSettings.get('foo');
      expect(value2).toBe('user-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('caches default value when user has not customized setting', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = {}; // No user customization
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      // First get() should fetch from ES
      const value1 = await uiSettings.get('foo');
      expect(value1).toBe('default-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // Second get() should use cache
      const value2 = await uiSettings.get('foo');
      expect(value2).toBe('default-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
    });

    it('does not cache settings without cacheTTL', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'value' };
      const defaults = {
        foo: {
          value: 'default',
          schema: schema.string(),
          // No cacheTTL
        },
      };

      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      // First get()
      await uiSettings.get('foo');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // Advance time to clear per-request cache (5s TTL)
      jest.advanceTimersByTime(10000);

      // Second get() should fetch from ES again (per-setting cache not used)
      await uiSettings.get('foo');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
    });

    it('does not cache overridden settings', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'user-value' };
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };
      const overrides = { foo: 'overridden-value' };

      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource,
        overrides,
        perSettingCache: sharedCache,
      });

      // First get()
      const value1 = await uiSettings.get('foo');
      expect(value1).toBe('overridden-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // Advance time to clear per-request cache
      jest.advanceTimersByTime(10000);

      // Second get() should fetch from ES again (per-setting cache not used for overridden)
      const value2 = await uiSettings.get('foo');
      expect(value2).toBe('overridden-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
    });

    it('invalidates cache when setting is updated via set()', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'initial-value' };
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      // First get() caches the value
      await uiSettings.get('foo');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // Update the setting
      await uiSettings.set('foo', 'updated-value');

      // Next get() should fetch from ES (cache invalidated)
      await uiSettings.get('foo');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
    });

    it('isolates cache by namespace for get() calls', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'value' };
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      // First client in space1
      const { uiSettings: uiSettings1, savedObjectsClient: client1 } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
        namespace: 'space1',
      });

      await uiSettings1.get('foo');
      expect(client1.get).toHaveBeenCalledTimes(1);

      // Second client in space2 should not use space1's cache
      const { uiSettings: uiSettings2, savedObjectsClient: client2 } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
        namespace: 'space2',
      });

      await uiSettings2.get('foo');
      expect(client2.get).toHaveBeenCalledTimes(1);

      // Third client in space1 should use cached value
      const { uiSettings: uiSettings3, savedObjectsClient: client3 } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
        namespace: 'space1',
      });

      await uiSettings3.get('foo');
      expect(client3.get).toHaveBeenCalledTimes(0); // Uses cache
    });

    it('respects TTL expiry for cached values in get()', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'value' };
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 5000, // 5 seconds
        },
      };

      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      // First get() caches the value
      await uiSettings.get('foo');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // Within TTL, should use cache
      jest.advanceTimersByTime(4000);
      await uiSettings.get('foo');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // After TTL expires, should fetch from ES
      jest.advanceTimersByTime(1000);
      await uiSettings.get('foo');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
    });

    it('works without perSettingCache (graceful degradation)', async () => {
      const esDocSource = { foo: 'value' };
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      // No perSettingCache provided
      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource,
        perSettingCache: undefined,
      });

      // Should work normally without per-setting cache
      const value1 = await uiSettings.get('foo');
      expect(value1).toBe('value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // Second call within per-request cache window should not fetch again
      const value2 = await uiSettings.get('foo');
      expect(value2).toBe('value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1); // Per-request cache still active
    });

    it('caches different settings independently', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'foo-value', bar: 'bar-value' };
      const defaults = {
        foo: {
          value: 'default-foo',
          schema: schema.string(),
          cacheTTL: 30000,
        },
        bar: {
          value: 'default-bar',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      // Get foo - caches it in per-setting cache
      const foo1 = await uiSettings.get('foo');
      expect(foo1).toBe('foo-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // Get bar - uses per-request cache from first call (same getAll result)
      const bar1 = await uiSettings.get('bar');
      expect(bar1).toBe('bar-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1); // Still 1 due to per-request cache

      // Get foo again - uses per-setting cache
      const foo2 = await uiSettings.get('foo');
      expect(foo2).toBe('foo-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // Get bar again - uses per-setting cache
      const bar2 = await uiSettings.get('bar');
      expect(bar2).toBe('bar-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

      // Advance time to clear per-request cache
      jest.advanceTimersByTime(10000);

      // Both should still use per-setting cache (not expired yet)
      const foo3 = await uiSettings.get('foo');
      const bar3 = await uiSettings.get('bar');
      expect(foo3).toBe('foo-value');
      expect(bar3).toBe('bar-value');
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1); // Still using per-setting cache
    });

    it('deduplicates concurrent requests for the same uncached setting', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'value' };
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      // Make 5 concurrent requests for the same setting
      const promises = [
        uiSettings.get('foo'),
        uiSettings.get('foo'),
        uiSettings.get('foo'),
        uiSettings.get('foo'),
        uiSettings.get('foo'),
      ];

      const results = await Promise.all(promises);

      // All should get the same value
      results.forEach((result) => {
        expect(result).toBe('value');
      });

      // But ES should only be called once (not 5 times)
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent requests across different client instances', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'value' };
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      // Create 3 different client instances sharing the same cache
      const { uiSettings: client1, savedObjectsClient: soClient1 } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      const { uiSettings: client2 } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      const { uiSettings: client3 } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      // Make concurrent requests from different clients
      const promises = [client1.get('foo'), client2.get('foo'), client3.get('foo')];

      const results = await Promise.all(promises);

      // All should get the same value
      results.forEach((result) => {
        expect(result).toBe('value');
      });

      // ES should only be called once (from first client)
      expect(soClient1.get).toHaveBeenCalledTimes(1);
    });

    it('does not deduplicate requests for different settings', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'foo-value', bar: 'bar-value' };
      const defaults = {
        foo: {
          value: 'default-foo',
          schema: schema.string(),
          cacheTTL: 30000,
        },
        bar: {
          value: 'default-bar',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      // Make concurrent requests for different settings
      const [foo, bar] = await Promise.all([uiSettings.get('foo'), uiSettings.get('bar')]);

      expect(foo).toBe('foo-value');
      expect(bar).toBe('bar-value');

      // Each setting triggers its own getAll since they're different keys
      // (no deduplication across different settings)
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
    });

    it('cleans up in-flight promises after they resolve', async () => {
      const sharedCache = new PerSettingCache();
      const esDocSource = { foo: 'value' };
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      const { uiSettings } = setup({
        defaults,
        esDocSource,
        perSettingCache: sharedCache,
      });

      // Make a request
      await uiSettings.get('foo');

      // Verify in-flight promise is cleaned up
      expect(sharedCache.getInflight('default', 'foo')).toBeNull();
    });

    it('clears in-flight promises when cache is invalidated via set()', async () => {
      const sharedCache = new PerSettingCache();
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      const { uiSettings } = setup({
        defaults,
        esDocSource: { foo: 'initial-value' },
        perSettingCache: sharedCache,
      });

      // Start a get() request but don't await it yet
      const promise1 = uiSettings.get('foo');

      // Verify in-flight promise exists
      expect(sharedCache.getInflight('default', 'foo')).toBeTruthy();

      // Update the setting - this should clear both cache AND in-flight promises
      await uiSettings.set('foo', 'new-value');

      // Verify in-flight promise was cleared by set()
      expect(sharedCache.getInflight('default', 'foo')).toBeNull();

      // Complete the first request
      await promise1;
    });

    it('prevents race condition: setMany() clears in-flight promises', async () => {
      const sharedCache = new PerSettingCache();
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
        bar: {
          value: 'default-bar',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      const { uiSettings } = setup({
        defaults,
        esDocSource: { foo: 'old-foo', bar: 'old-bar' },
        perSettingCache: sharedCache,
      });

      // Start get() requests but don't await
      const promise1 = uiSettings.get('foo');
      const promise2 = uiSettings.get('bar');

      // Verify in-flight promises exist
      expect(sharedCache.getInflight('default', 'foo')).toBeTruthy();
      expect(sharedCache.getInflight('default', 'bar')).toBeTruthy();

      // setMany() should clear in-flight promises for changed keys only
      await uiSettings.setMany({ foo: 'new-foo' });

      // foo's in-flight should be cleared, bar's should remain
      expect(sharedCache.getInflight('default', 'foo')).toBeNull();
      expect(sharedCache.getInflight('default', 'bar')).toBeTruthy();

      // Complete promises
      await Promise.all([promise1, promise2]);
    });

    it('prevents stale in-flight promise from caching after invalidation', async () => {
      const sharedCache = new PerSettingCache();
      const defaults = {
        foo: {
          value: 'default-value',
          schema: schema.string(),
          cacheTTL: 30000,
        },
      };

      const { uiSettings, savedObjectsClient } = setup({
        defaults,
        esDocSource: { foo: 'old-value' },
        perSettingCache: sharedCache,
      });

      // Create a promise that we can control when it resolves
      let resolveGetAll: (value: any) => void;
      const controlledPromise = new Promise((resolve) => {
        resolveGetAll = resolve;
      });

      // Mock getAll to return our controlled promise
      savedObjectsClient.get.mockReturnValueOnce(
        controlledPromise.then(() => ({ attributes: { foo: 'old-value' } })) as any
      );

      // Start get() - this will create an in-flight promise
      const getPromise = uiSettings.get('foo');

      // Verify in-flight promise exists
      expect(sharedCache.getInflight('default', 'foo')).toBeTruthy();

      // Invalidate the cache BEFORE the promise resolves
      await uiSettings.set('foo', 'new-value');

      // In-flight promise should be cleared
      expect(sharedCache.getInflight('default', 'foo')).toBeNull();

      // Now let the original promise resolve with old data
      resolveGetAll!({ attributes: { foo: 'old-value' } });
      await getPromise;

      // Verify the cache was NOT populated with stale data
      // (The promise saw it was no longer in-flight and skipped caching)
      expect(sharedCache.get('default', 'foo')).toBeNull();
    });
  });
});
