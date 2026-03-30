/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuHeaderTab } from '@kbn/core-chrome-app-menu-components';
import type { ReactNode } from 'react';

export function mapApmPageHeaderTabsToAppMenuHeaderTabs(
  tabs: Array<{
    key: string;
    href?: string;
    label: ReactNode;
    append?: ReactNode;
    isSelected: boolean;
    'data-test-subj': string;
  }>
): AppMenuHeaderTab[] {
  return tabs.map((tab) => ({
    id: `apm-service-detail-${tab.key}`,
    label: tab.label,
    append: tab.append,
    isSelected: tab.isSelected,
    href: tab.href,
    testId: tab['data-test-subj'],
  }));
}
