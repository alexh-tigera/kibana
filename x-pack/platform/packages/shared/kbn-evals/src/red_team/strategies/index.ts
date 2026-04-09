/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Strategy, StrategyFactory } from '../types';
import { createDirectStrategy } from './direct';

const STRATEGIES: Record<string, StrategyFactory> = {
  direct: createDirectStrategy,
};

export const getStrategy = (name: string, config?: Record<string, unknown>): Strategy => {
  const factory = Object.hasOwn(STRATEGIES, name) ? STRATEGIES[name] : undefined;
  if (!factory) {
    const available = Object.keys(STRATEGIES).join(', ');
    throw new Error(`Unknown strategy "${name}". Available: ${available}`);
  }
  return factory(config);
};

export const getAvailableStrategies = (): string[] => Object.keys(STRATEGIES);
