/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultGraphAnnotation } from '.';
import {
  DEFAULT_MAX_GENERATION_ATTEMPTS,
  DEFAULT_MAX_HALLUCINATION_FAILURES,
  DEFAULT_MAX_REPEATED_GENERATIONS,
} from '../constants';
import {
  ATTACK_DISCOVERY_CONTINUE,
  ATTACK_DISCOVERY_DEFAULT,
  ATTACK_DISCOVERY_REFINE,
} from '../../../../prompt/prompts';

const defaultAttackDiscoveryPrompt = ATTACK_DISCOVERY_DEFAULT;
const defaultRefinePrompt = ATTACK_DISCOVERY_REFINE;
const prompts = {
  continue: ATTACK_DISCOVERY_CONTINUE,
  default: defaultAttackDiscoveryPrompt,
  refine: defaultRefinePrompt,
};
describe('getDefaultGraphState', () => {
  it('returns the expected default attackDiscoveries', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.insights.get()).toBeNull();
  });

  it('returns the expected default attackDiscoveryPrompt', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.prompt.get()).toEqual(defaultAttackDiscoveryPrompt);
  });

  it('returns the expected default empty collection of anonymizedAlerts', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.anonymizedDocuments.get()).toHaveLength(0);
  });

  it('returns the expected default combinedGenerations state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.combinedGenerations.get()).toBe('');
  });

  it('returns the expected default combinedRefinements state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.combinedRefinements.get()).toBe('');
  });

  it('returns the expected default errors state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.errors.get()).toHaveLength(0);
  });

  it('return the expected default generationAttempts state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.generationAttempts.get()).toBe(0);
  });

  it('returns the expected default generations state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.generations.get()).toHaveLength(0);
  });

  it('returns the expected default hallucinationFailures state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.hallucinationFailures.get()).toBe(0);
  });

  it('returns the expected default refinePrompt state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.refinePrompt.get()).toEqual(defaultRefinePrompt);
  });

  it('returns the expected default maxGenerationAttempts state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.maxGenerationAttempts.get()).toBe(DEFAULT_MAX_GENERATION_ATTEMPTS);
  });

  it('returns the expected default maxHallucinationFailures state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });
    expect(graphAnnotation.spec.maxHallucinationFailures.get()).toBe(
      DEFAULT_MAX_HALLUCINATION_FAILURES
    );
  });

  it('returns the expected default maxRepeatedGenerations state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.maxRepeatedGenerations.get()).toBe(
      DEFAULT_MAX_REPEATED_GENERATIONS
    );
  });

  it('returns the expected default refinements state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.refinements.get()).toHaveLength(0);
  });

  it('returns the expected default replacements state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.replacements.get()).toEqual({});
  });

  it('returns the expected default unrefinedResults state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.unrefinedResults.get()).toBeNull();
  });

  it('returns the expected default continuePrompt state', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.continuePrompt.get()).toBe(prompts.continue);
  });

  it('returns the expected default end', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.end.isAvailable()).toBe(false);
  });

  it('returns the expected end when it is provided', () => {
    const end = '2025-01-02T00:00:00.000Z';

    const graphAnnotation = getDefaultGraphAnnotation({ prompts, end });

    expect(graphAnnotation.spec.end.isAvailable()).toBe(true);
    expect(graphAnnotation.spec.end.get()).toEqual(end);
  });

  it('returns the expected default filter to be undefined', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.filter.isAvailable()).toBe(false);
  });

  it('returns the expected filter when it is provided', () => {
    const filter = {
      bool: {
        must: [],
        filter: [
          {
            match_phrase: {
              'user.name': 'root',
            },
          },
        ],
        should: [],
        must_not: [
          {
            match_phrase: {
              'host.name': 'foo',
            },
          },
        ],
      },
    };

    const graphAnnotation = getDefaultGraphAnnotation({ prompts, filter });

    expect(graphAnnotation.spec.filter.isAvailable()).toBe(true);
    expect(graphAnnotation.spec.filter.get()).toEqual(filter);
  });

  it('returns the expected default start to be undefined', () => {
    const graphAnnotation = getDefaultGraphAnnotation({ prompts });

    expect(graphAnnotation.spec.start.isAvailable()).toBe(false);
  });

  it('returns the expected start when it is provided', () => {
    const start = '2025-01-01T00:00:00.000Z';

    const graphAnnotation = getDefaultGraphAnnotation({ prompts, start });

    expect(graphAnnotation.spec.start.isAvailable()).toBe(true);
    expect(graphAnnotation.spec.start.get()).toEqual(start);
  });
});
