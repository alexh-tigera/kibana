/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelFamily, ModelProvider } from '../model_provider';

export interface ModelDefinition {
  id: string;
  provider: ModelProvider;
  family: ModelFamily;
  contextWindow: number;
  /** Maximum output tokens the model supports. Used as max_completion_tokens for providers that need it. */
  maxOutputTokens?: number;
}

/**
 * Retrieve a model definition from the given full model name, if available.
 */
/**
 * Tokenize a model name into lowercase segments, treating dots, dashes, and
 * slashes as separators.
 */
const tokenize = (name: string): string[] =>
  name
    .toLowerCase()
    .split(/[.\-\/]/)
    .filter(Boolean);

/**
 * Check whether every segment of `modelId` appears in `fullName`, regardless of
 * order or extra segments. This handles proxied names like
 * "llm-gateway/claude-sonnet-4-6" matching the known id "claude-4.6-sonnet".
 */
const segmentsMatch = (fullName: string, modelId: string): boolean => {
  const inputTokens = tokenize(fullName);
  const idTokens = tokenize(modelId);
  return idTokens.every((token) => inputTokens.includes(token));
};

export const getModelDefinition = (fullModelName: string): ModelDefinition | undefined => {
  // First try exact substring match (fast path)
  const exact = knownModels.find(
    (model) =>
      fullModelName.includes(model.id) || fullModelName.includes(model.id.replaceAll('.', '-'))
  );
  if (exact) return exact;

  // Fall back to segment-based matching to handle reordered names
  // e.g. "llm-gateway/claude-sonnet-4-6" matches "claude-4.6-sonnet"
  // Sort by id length descending so more specific models match first
  const sorted = [...knownModels].sort((a, b) => b.id.length - a.id.length);
  return sorted.find((model) => segmentsMatch(fullModelName, model.id));
};

/**
 * List of manually maintained model definitions to use as fallback for feature detection.
 */
export const knownModels: ModelDefinition[] = [
  {
    id: 'gpt-4o-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 128000,
    maxOutputTokens: 16384,
  },
  {
    id: 'gpt-4o',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 128000,
    maxOutputTokens: 16384,
  },
  {
    id: 'gpt-4.1-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1000000,
    maxOutputTokens: 32768,
  },
  {
    id: 'gpt-4.1-nano',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1000000,
    maxOutputTokens: 32768,
  },
  {
    id: 'gpt-4.1',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1000000,
    maxOutputTokens: 32768,
  },
  {
    id: 'gemini-1.5-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
  },
  {
    id: 'gemini-1.5-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
  },
  {
    id: 'gemini-2.0-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
  },
  {
    id: 'gemini-2.0-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 2000000,
    maxOutputTokens: 8192,
  },
  {
    id: 'gemini-2.0-flash-lite',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
  },
  {
    id: 'gemini-2.5-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
    maxOutputTokens: 65536,
  },
  {
    id: 'gemini-2.5-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 128000, // or 1000000 in MAX mode...
    maxOutputTokens: 65536,
  },
  // Claude models
  {
    id: 'claude-3-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
    maxOutputTokens: 8192,
  },
  {
    id: 'claude-3-haiku',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
    maxOutputTokens: 8192,
  },
  {
    id: 'claude-3-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
    maxOutputTokens: 8192,
  },
  {
    id: 'claude-3.5-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
    maxOutputTokens: 8192,
  },
  {
    id: 'claude-3.5-haiku',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
    maxOutputTokens: 8192,
  },
  {
    id: 'claude-3.7-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
    maxOutputTokens: 16384,
  },
  {
    id: 'claude-4-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
    maxOutputTokens: 64000,
  },
  {
    id: 'claude-4-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
    maxOutputTokens: 32000,
  },
  {
    id: 'claude-4.5-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
    maxOutputTokens: 64000,
  },
  {
    id: 'claude-4.6-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
    maxOutputTokens: 64000,
  },
  {
    id: 'claude-4.6-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
    maxOutputTokens: 32000,
  },
  // OpenAI o-series reasoning models
  {
    id: 'o3-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 200000,
    maxOutputTokens: 100000,
  },
  {
    id: 'o3',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 200000,
    maxOutputTokens: 100000,
  },
  {
    id: 'o4-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 200000,
    maxOutputTokens: 100000,
  },
];
