/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuHeaderTab } from '@kbn/core-chrome-app-menu-components';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface ApmServiceDetailAppMenuHeaderTabsContextValue {
  headerTabs: AppMenuHeaderTab[] | undefined;
  setHeaderTabs: (tabs: AppMenuHeaderTab[] | undefined) => void;
}

const ApmServiceDetailAppMenuHeaderTabsContext =
  createContext<ApmServiceDetailAppMenuHeaderTabsContextValue | null>(null);

export function ApmServiceDetailAppMenuHeaderTabsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [headerTabs, setHeaderTabsState] = useState<AppMenuHeaderTab[] | undefined>();

  const setHeaderTabs = useCallback((next: AppMenuHeaderTab[] | undefined) => {
    setHeaderTabsState(next);
  }, []);

  const value = useMemo(
    () => ({
      headerTabs,
      setHeaderTabs,
    }),
    [headerTabs, setHeaderTabs]
  );

  return (
    <ApmServiceDetailAppMenuHeaderTabsContext.Provider value={value}>
      {children}
    </ApmServiceDetailAppMenuHeaderTabsContext.Provider>
  );
}

export function useApmServiceDetailAppMenuHeaderTabs(): AppMenuHeaderTab[] | undefined {
  const ctx = useContext(ApmServiceDetailAppMenuHeaderTabsContext);
  return ctx?.headerTabs;
}

export function useSetApmServiceDetailAppMenuHeaderTabs(): (
  tabs: AppMenuHeaderTab[] | undefined
) => void {
  const ctx = useContext(ApmServiceDetailAppMenuHeaderTabsContext);
  if (!ctx) {
    throw new Error('useSetApmServiceDetailAppMenuHeaderTabs must be used within provider');
  }
  return ctx.setHeaderTabs;
}
