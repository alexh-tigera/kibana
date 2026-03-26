/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPageHeaderProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppMenuHeaderTab } from '@kbn/core-chrome-app-menu-components';
import { useMemo } from 'react';
import { useApmRouter } from './use_apm_router';
import { useAnyOfApmParams } from './use_apm_params';

export type ServiceGroupTabKey = 'service-inventory' | 'service-map';

type PageHeaderTab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key: ServiceGroupTabKey;
  breadcrumbLabel?: string;
};

export function buildServiceGroupTabDefinitions(
  router: ReturnType<typeof useApmRouter>,
  query: unknown
): PageHeaderTab[] {
  return [
    {
      key: 'service-inventory',
      breadcrumbLabel: i18n.translate('xpack.apm.serviceGroup.serviceInventory', {
        defaultMessage: 'Inventory',
      }),
      label: (
        <EuiFlexGroup justifyContent="flexStart" alignItems="baseline" gutterSize="s">
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.apm.serviceGroup.serviceInventory', {
              defaultMessage: 'Inventory',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      href: router.link('/services', { query }),
    },
    {
      key: 'service-map',
      label: i18n.translate('xpack.apm.serviceGroup.serviceMap', {
        defaultMessage: 'Service map',
      }),
      href: router.link('/service-map', { query }),
    },
  ];
}

const inventoryLabel = i18n.translate('xpack.apm.serviceGroup.serviceInventory', {
  defaultMessage: 'Inventory',
});
const serviceMapLabel = i18n.translate('xpack.apm.serviceGroup.serviceMap', {
  defaultMessage: 'Service map',
});

/**
 * Build AppMenuBar header tabs for project chrome (caller supplies router + query from useMaybeApmParams).
 */
export function getServiceGroupAppMenuHeaderTabs({
  router,
  query,
  selectedTab,
}: {
  router: ReturnType<typeof useApmRouter>;
  query: unknown;
  selectedTab: ServiceGroupTabKey;
}): AppMenuHeaderTab[] {
  const definitions = buildServiceGroupTabDefinitions(router, query);
  return definitions.map(({ key, href }) => ({
    id: `apm-service-group-${key}`,
    label: key === 'service-inventory' ? inventoryLabel : serviceMapLabel,
    isSelected: key === selectedTab,
    href,
    testId: `apmServiceGroupTab-${key}`,
  }));
}

/**
 * Tabs for Service inventory / Service map routes — shared between EuiPageHeader (classic) and AppMenu headerTabs (project).
 */
export function useServiceGroupTabs(selectedTab: ServiceGroupTabKey): {
  pageHeaderTabs: NonNullable<EuiPageHeaderProps['tabs']>;
  appMenuHeaderTabs: AppMenuHeaderTab[];
} {
  const router = useApmRouter();
  const { query } = useAnyOfApmParams('/services', '/service-map');

  return useMemo(() => {
    const definitions = buildServiceGroupTabDefinitions(router, query);

    const pageHeaderTabs = definitions
      .filter((t) => !t.hidden)
      .map(({ href, key, label, breadcrumbLabel }) => ({
        href,
        label,
        isSelected: key === selectedTab,
        breadcrumbLabel,
      }));

    const appMenuHeaderTabs = getServiceGroupAppMenuHeaderTabs({
      router,
      query,
      selectedTab,
    });

    return { pageHeaderTabs, appMenuHeaderTabs };
  }, [query, router, selectedTab]);
}
