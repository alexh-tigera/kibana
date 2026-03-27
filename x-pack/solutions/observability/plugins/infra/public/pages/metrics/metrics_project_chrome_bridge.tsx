/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

export interface MetricsProjectChromeBridgeContextValue {
  registerOpenAnomalyFlyout: (open: (() => void) | null) => void;
  openAnomalyFlyoutFromAppMenu: () => void;
}

const MetricsProjectChromeBridgeContext =
  createContext<MetricsProjectChromeBridgeContextValue | null>(null);

export function MetricsProjectChromeBridgeProvider({ children }: { children: ReactNode }) {
  const anomalyOpenRef = useRef<(() => void) | null>(null);
  const registerOpenAnomalyFlyout = useCallback((fn: (() => void) | null) => {
    anomalyOpenRef.current = fn;
  }, []);
  const openAnomalyFlyoutFromAppMenu = useCallback(() => {
    anomalyOpenRef.current?.();
  }, []);

  const value = useMemo(
    (): MetricsProjectChromeBridgeContextValue => ({
      registerOpenAnomalyFlyout,
      openAnomalyFlyoutFromAppMenu,
    }),
    [openAnomalyFlyoutFromAppMenu, registerOpenAnomalyFlyout]
  );

  return (
    <MetricsProjectChromeBridgeContext.Provider value={value}>
      {children}
    </MetricsProjectChromeBridgeContext.Provider>
  );
}

export function useOptionalMetricsProjectChromeBridge(): MetricsProjectChromeBridgeContextValue | null {
  return useContext(MetricsProjectChromeBridgeContext);
}

export function useMetricsProjectChromeBridge(): MetricsProjectChromeBridgeContextValue {
  const ctx = useOptionalMetricsProjectChromeBridge();
  if (!ctx) {
    throw new Error(
      'useMetricsProjectChromeBridge must be used within MetricsProjectChromeBridgeProvider'
    );
  }
  return ctx;
}
