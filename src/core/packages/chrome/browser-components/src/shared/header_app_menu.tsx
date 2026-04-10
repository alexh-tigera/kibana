/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense, useMemo } from 'react';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { useAppMenu } from './chrome_hooks';

const AppMenu = lazy(async () => {
  const { AppMenuComponent } = await import('@kbn/core-chrome-app-menu-components');
  return { default: AppMenuComponent };
});

interface HeaderAppMenuProps {
  baseItems?: AppMenuItemType[];
}

export const HeaderAppMenu = ({ baseItems }: HeaderAppMenuProps) => {
  const menuConfig = useAppMenu();

  const mergedConfig = useMemo(() => {
    const hasBaseItems = baseItems && baseItems.length > 0;
    if (!menuConfig) {
      return hasBaseItems ? { layout: 'chromeBarV2' as const, overflowOnlyItems: baseItems } : null;
    }
    if (!hasBaseItems) {
      return menuConfig;
    }
    return {
      ...menuConfig,
      overflowOnlyItems: [...(menuConfig.overflowOnlyItems ?? []), ...baseItems],
    };
  }, [menuConfig, baseItems]);

  if (!mergedConfig) {
    return null;
  }

  return (
    <Suspense>
      <AppMenu config={mergedConfig} />
    </Suspense>
  );
};
