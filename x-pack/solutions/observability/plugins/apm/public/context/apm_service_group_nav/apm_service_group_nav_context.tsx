/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

export interface ApmServiceGroupNavContextValue {
  /**
   * When true, show All services | Service groups above the search bar (project chrome body).
   */
  showServiceGroupsButtonRow: boolean;
  selectedNavButton?: 'serviceGroups' | 'allServices';
}

const defaultValue: ApmServiceGroupNavContextValue = {
  showServiceGroupsButtonRow: false,
  selectedNavButton: undefined,
};

const ApmServiceGroupNavContext = createContext<ApmServiceGroupNavContextValue>(defaultValue);

export const ApmServiceGroupNavProvider = ApmServiceGroupNavContext.Provider;

export function useApmServiceGroupNav(): ApmServiceGroupNavContextValue {
  return useContext(ApmServiceGroupNavContext);
}
