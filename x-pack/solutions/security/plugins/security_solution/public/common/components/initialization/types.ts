/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InitializationFlowId } from '../../../../common/api/initialization';

export interface InitializationFlowState {
  /** True while a request is in flight or retries are pending. */
  loading: boolean;
  /** The flow's payload once it completes with status: 'ready', null otherwise. */
  result: Record<string, unknown> | null;
  /** Set only when all retries are exhausted and the flow never succeeded. */
  error: string | null;
}

export type InitializationState = Partial<Record<InitializationFlowId, InitializationFlowState>>;
