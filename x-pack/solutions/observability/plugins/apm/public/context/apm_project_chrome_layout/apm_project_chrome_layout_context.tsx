/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

export interface ApmProjectChromeLayoutContextValue {
  /**
   * When true, Environment filter is rendered in the page body on the unified search row (project chrome).
   */
  environmentInSearchRow: boolean;
}

const ApmProjectChromeLayoutContext = createContext<ApmProjectChromeLayoutContextValue>({
  environmentInSearchRow: false,
});

export const ApmProjectChromeLayoutProvider = ApmProjectChromeLayoutContext.Provider;

export function useApmProjectChromeLayout(): ApmProjectChromeLayoutContextValue {
  return useContext(ApmProjectChromeLayoutContext);
}
