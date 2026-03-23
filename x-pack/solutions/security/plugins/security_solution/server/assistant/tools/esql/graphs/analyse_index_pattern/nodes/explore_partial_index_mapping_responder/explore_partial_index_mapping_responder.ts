/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { CreateLlmInstance } from '../../../../utils/common';
import type { AnalyzeIndexPatternAnnotation } from '../../state';
import { buildContext } from './utils';

interface IndexMappingAnalysis {
  readonly containsRequiredFieldsForQuery: boolean;
}

const structuredOutputSchema = {
  type: 'object',
  properties: {
    containsRequiredFieldsForQuery: {
      type: 'boolean',
      description: 'Whether the index pattern contains the required fields for the query',
    },
  },
  required: ['containsRequiredFieldsForQuery'],
  additionalProperties: false,
} as const satisfies Record<string, unknown>;

export const getExplorePartialIndexMappingResponder = async ({
  createLlmInstance,
}: {
  createLlmInstance: CreateLlmInstance;
}) => {
  const llm = (await createLlmInstance()) as BaseChatModel;
  return async (state: typeof AnalyzeIndexPatternAnnotation.State) => {
    const { messages } = state;

    const lastMessage = messages[messages.length - 1];

    const result = await llm
      .withStructuredOutput<IndexMappingAnalysis>(structuredOutputSchema, {
        name: 'indexMappingAnalysis',
      })
      .invoke([
        new SystemMessage({
          content:
            'You are an expert at parsing text. You have been given a text and need to parse it into the provided schema.',
        }),
        new HumanMessage({
          content: lastMessage.content,
        }),
      ]);

    return new Command({
      update: {
        output: {
          containsRequiredFieldsForQuery: result.containsRequiredFieldsForQuery,
          context: JSON.stringify(buildContext(messages)),
        },
      },
    });
  };
};
