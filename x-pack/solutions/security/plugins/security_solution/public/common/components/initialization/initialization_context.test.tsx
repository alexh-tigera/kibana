/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';

import { InitializationContext, InitializationProvider } from './initialization_context';
import { initializeSecuritySolution } from './api';
import { useHttp } from '../../lib/kibana';

jest.mock('./api');
jest.mock('../../lib/kibana');

const mockHttp = {};
const mockInitializeSecuritySolution = initializeSecuritySolution as jest.MockedFunction<
  typeof initializeSecuritySolution
>;

describe('InitializationProvider - happy path', () => {
  const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <InitializationProvider>{children}</InitializationProvider>
  );

  const renderContext = () => renderHook(() => useContext(InitializationContext), { wrapper });

  beforeEach(() => {
    jest.clearAllMocks();
    (useHttp as jest.Mock).mockReturnValue(mockHttp);
  });

  it('sets loading=false, result=payload, error=null when a single flow succeeds', async () => {
    mockInitializeSecuritySolution.mockResolvedValueOnce({
      flows: {
        'create-list-indices': { status: 'ready', payload: { index: 'my-index' } },
      },
    });

    const { result } = renderContext();

    act(() => {
      result.current.requestInitialization(['create-list-indices']);
    });

    await waitFor(() => {
      expect(result.current.state['create-list-indices']?.loading).toBe(false);
    });

    expect(result.current.state['create-list-indices']).toEqual({
      loading: false,
      result: { index: 'my-index' },
      error: null,
    });
    expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(1);
  });

  it('sets loading=false and result=null when status is ready but no payload is returned', async () => {
    mockInitializeSecuritySolution.mockResolvedValueOnce({
      flows: { 'create-list-indices': { status: 'ready' } },
    });

    const { result } = renderContext();

    act(() => {
      result.current.requestInitialization(['create-list-indices']);
    });

    await waitFor(() => {
      expect(result.current.state['create-list-indices']?.loading).toBe(false);
    });

    expect(result.current.state['create-list-indices']).toEqual({
      loading: false,
      result: null,
      error: null,
    });
    expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(1);
  });

  it('resolves all flows in a batch in a single request', async () => {
    mockInitializeSecuritySolution.mockResolvedValueOnce({
      flows: {
        'create-list-indices': { status: 'ready', payload: { index: 'lists' } },
        'bootstrap-prebuilt-rules': { status: 'ready', payload: { count: 42 } },
      },
    });

    const { result } = renderContext();

    act(() => {
      result.current.requestInitialization(['create-list-indices', 'bootstrap-prebuilt-rules']);
    });

    await waitFor(() => {
      expect(result.current.state['create-list-indices']?.loading).toBe(false);
      expect(result.current.state['bootstrap-prebuilt-rules']?.loading).toBe(false);
    });

    expect(result.current.state['create-list-indices']).toEqual({
      loading: false,
      result: { index: 'lists' },
      error: null,
    });
    expect(result.current.state['bootstrap-prebuilt-rules']).toEqual({
      loading: false,
      result: { count: 42 },
      error: null,
    });
    expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(1);
    expect(mockInitializeSecuritySolution).toHaveBeenCalledWith({
      http: mockHttp,
      flows: ['create-list-indices', 'bootstrap-prebuilt-rules'],
    });
  });

  it('sets loading=true immediately before the request settles', async () => {
    mockInitializeSecuritySolution.mockImplementation(() => new Promise(() => {}));

    const { result } = renderContext();

    act(() => {
      result.current.requestInitialization(['create-list-indices']);
    });

    await waitFor(() => {
      expect(result.current.state['create-list-indices']).toEqual({
        loading: true,
        result: null,
        error: null,
      });
    });
  });
});

describe('InitializationProvider - error flow', () => {
  const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <InitializationProvider>{children}</InitializationProvider>
  );

  const renderContext = () => renderHook(() => useContext(InitializationContext), { wrapper });

  beforeEach(() => {
    jest.clearAllMocks();
    (useHttp as jest.Mock).mockReturnValue(mockHttp);
  });

  describe('error message extraction', () => {
    it('uses err.body.message when available', async () => {
      mockInitializeSecuritySolution.mockRejectedValue({ body: { message: 'Server error' } });

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      // error is only surfaced once all retries are exhausted
      await waitFor(() => {
        expect(result.current.state['create-list-indices']?.error).toBe('Server error');
      });
    });

    it('falls back to err.message when body.message is absent', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('Network error'));

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      await waitFor(() => {
        expect(result.current.state['create-list-indices']?.error).toBe('Network error');
      });
    });

    it('falls back to "Unknown error" when neither body.message nor message is present', async () => {
      mockInitializeSecuritySolution.mockRejectedValue({});

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      await waitFor(() => {
        expect(result.current.state['create-list-indices']?.error).toBe('Unknown error');
      });
    });
  });

  describe('state shape on error', () => {
    it('sets loading=false and result=null after all retries are exhausted', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('fail'));

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      await waitFor(() => {
        expect(result.current.state['create-list-indices']?.loading).toBe(false);
      });

      expect(result.current.state['create-list-indices']).toMatchObject({
        loading: false,
        result: null,
        error: 'fail',
      });
    });

    it('sets error on every flow in the batch when all retries are exhausted', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('batch fail'));

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices', 'bootstrap-prebuilt-rules']);
      });

      await waitFor(() => {
        expect(result.current.state['create-list-indices']).toMatchObject({
          loading: false,
          result: null,
          error: 'batch fail',
        });
        expect(result.current.state['bootstrap-prebuilt-rules']).toMatchObject({
          loading: false,
          result: null,
          error: 'batch fail',
        });
      });
    });

    it('sets loading=true immediately when the request is dispatched', async () => {
      // Use a never-settling promise so we can observe the in-flight state
      mockInitializeSecuritySolution.mockImplementation(
        () => new Promise(() => {}) // never resolves / rejects
      );

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      await waitFor(() => {
        expect(result.current.state['create-list-indices']).toEqual({
          loading: true,
          result: null,
          error: null,
        });
      });
    });

    it('keeps loading=true while retries are pending, only sets loading=false when budget is exhausted', async () => {
      // Calls 1 and 2 reject; call 3 also rejects and exhausts the budget.
      mockInitializeSecuritySolution.mockRejectedValue(new Error('fail'));

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      // After the first rejection the flow is still loading (retry 1 is pending).
      // We can only assert the final state once loading becomes false.
      await waitFor(() => {
        expect(result.current.state['create-list-indices']?.loading).toBe(false);
      });

      // By the time loading is false all 3 calls have been made.
      expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
      expect(result.current.state['create-list-indices']).toMatchObject({
        loading: false,
        result: null,
        error: 'fail',
      });
    });
  });

  describe('retry logic', () => {
    it('retries a failing flow up to DEFAULT_MAX_RETRIES (2) times, making 3 total API calls', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('fail'));

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      await waitFor(() => {
        expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
      });
    });

    it('stops retrying after retry budget is exhausted', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('fail'));

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      await waitFor(() => {
        expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
      });

      // Give the event loop a few ticks to confirm no further calls are queued
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
    });

    it('leaves the flow in an error state after all retries are exhausted', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('terminal'));

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      await waitFor(() => {
        expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
      });

      expect(result.current.state['create-list-indices']).toMatchObject({
        loading: false,
        result: null,
        error: 'terminal',
      });
    });

    it('retries each flow in a batch independently, with one recovering on the final retry', async () => {
      mockInitializeSecuritySolution
        // Call 1: network-level failure – both flows caught, retryCount 0 → 1.
        .mockRejectedValueOnce(new Error('network error'))
        // Call 2: server returns status:error for both – retryCount 1 → 2.
        .mockResolvedValueOnce({
          flows: {
            'create-list-indices': { status: 'error', error: 'server error attempt 2' },
            'bootstrap-prebuilt-rules': { status: 'error', error: 'server error attempt 2' },
          },
        })
        // Call 3: final retry – create-list-indices recovers; retryCount 2 = max, no further retries.
        .mockResolvedValueOnce({
          flows: {
            'create-list-indices': { status: 'ready' },
            'bootstrap-prebuilt-rules': { status: 'error', error: 'permanent failure' },
          },
        });

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices', 'bootstrap-prebuilt-rules']);
      });

      await waitFor(() => {
        expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
      });

      // Both flows must appear in every batch
      for (const call of mockInitializeSecuritySolution.mock.calls) {
        expect(call[0].flows).toContain('create-list-indices');
        expect(call[0].flows).toContain('bootstrap-prebuilt-rules');
      }

      // create-list-indices recovered on the final retry
      expect(result.current.state['create-list-indices']).toMatchObject({
        loading: false,
        result: null, // no payload in mock
        error: null,
      });

      // bootstrap-prebuilt-rules never recovered; error field comes from the server response
      expect(result.current.state['bootstrap-prebuilt-rules']).toMatchObject({
        loading: false,
        result: null,
        error: 'permanent failure',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // In-flight deduplication
  // ---------------------------------------------------------------------------

  describe('in-flight deduplication', () => {
    it('does not send a second request for a flow that is already in-flight', async () => {
      mockInitializeSecuritySolution.mockImplementation(
        () => new Promise(() => {}) // never resolves so the flow stays in-flight
      );

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      await waitFor(() => {
        expect(result.current.state['create-list-indices']?.loading).toBe(true);
      });

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(1);
    });

    it('does not re-request a flow that already completed successfully', async () => {
      mockInitializeSecuritySolution.mockResolvedValueOnce({
        flows: { 'create-list-indices': { status: 'ready' } },
      });

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      await waitFor(() => {
        expect(result.current.state['create-list-indices']?.loading).toBe(false);
      });

      mockInitializeSecuritySolution.mockClear();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      expect(mockInitializeSecuritySolution).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Missing flow in server response
  // ---------------------------------------------------------------------------

  describe('missing flow in server response', () => {
    it('stays loading during retries and surfaces the error once the budget is exhausted', async () => {
      // Every call returns an empty flows object so all 3 attempts see the flow as missing.
      mockInitializeSecuritySolution.mockResolvedValue({ flows: {} });

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices']);
      });

      // The flow stays loading:true while retries are in flight.
      // Wait for the terminal error state which only appears after budget exhaustion.
      await waitFor(() => {
        expect(result.current.state['create-list-indices']).toEqual({
          loading: false,
          result: null,
          error: 'No result returned from server',
        });
      });

      expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
    });

    it('only retries the missing flow, leaving the successful flow intact', async () => {
      // create-list-indices always succeeds; bootstrap-prebuilt-rules is always absent.
      mockInitializeSecuritySolution.mockResolvedValue({
        flows: {
          'create-list-indices': { status: 'ready' },
        },
      });

      const { result } = renderContext();

      act(() => {
        result.current.requestInitialization(['create-list-indices', 'bootstrap-prebuilt-rules']);
      });

      // Wait for bootstrap-prebuilt-rules to reach its terminal error state.
      await waitFor(() => {
        expect(result.current.state['bootstrap-prebuilt-rules']).toEqual({
          loading: false,
          result: null,
          error: 'No result returned from server',
        });
      });

      // Call 1 sends both flows; calls 2 and 3 retry only bootstrap-prebuilt-rules.
      expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);

      expect(result.current.state['create-list-indices']).toEqual({
        loading: false,
        result: null,
        error: null,
      });
    });
  });
});
