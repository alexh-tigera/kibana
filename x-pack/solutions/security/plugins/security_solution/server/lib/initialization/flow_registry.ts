/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  InitializationFlowId,
  InitializationFlowResult,
  InitializeSecuritySolutionResponse,
} from '../../../common/api/initialization';
import type { InitializationFlowContext, InitializationFlowDefinition } from './types';
import { createListIndicesInitializationFlow } from './flows/create_list_indices';
import type { CreateListIndicesInitializationFlowContext } from './flows/create_list_indices/types';

type ProvisionContext = CreateListIndicesInitializationFlowContext;

const flows: ReadonlyMap<
  InitializationFlowId,
  InitializationFlowDefinition<ProvisionContext>
> = new Map([[createListIndicesInitializationFlow.id, createListIndicesInitializationFlow]]);

export class FlowInitializationError extends Error {}

/**
 * Runs the requested initialization flows in parallel and returns the results.
 */
export const runInitializationFlows = async (
  requestedFlows: InitializationFlowId[],
  context: InitializationFlowContext,
  logger: Logger
): Promise<InitializeSecuritySolutionResponse> => {
  const promises = requestedFlows.map(
    async (
      flowId: InitializationFlowId
    ): Promise<{ id: InitializationFlowId; result: InitializationFlowResult }> => {
      const definition = flows.get(flowId);

      if (!definition) {
        return {
          id: flowId,
          result: {
            status: 'error',
            error: `Initialization flow '${flowId}' is not registered`,
          },
        };
      }

      try {
        const provisionContext = await definition.resolveProvisionContext(context, logger);
        const result = await definition.provision(provisionContext, logger);
        return {
          id: flowId,
          result,
        };
      } catch (err) {
        logger.error(`Initialization flow '${flowId}' failed: ${err.message}`);
        const errMessage =
          err instanceof FlowInitializationError
            ? err.message
            : 'internal initialization flow error';
        return {
          id: flowId,
          result: {
            status: 'error',
            error: errMessage,
          },
        };
      }
    }
  );

  const results = await Promise.all(promises);
  const flowResults = results.reduce((acc, { id, result }) => {
    acc[id] = result;
    return acc;
  }, {} as Record<InitializationFlowId, InitializationFlowResult>);

  return { flows: flowResults };
};
