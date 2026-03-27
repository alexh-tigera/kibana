/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';

import { AppMenu } from '@kbn/core-chrome-app-menu';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { TabbedTableListView } from '@kbn/content-management-tabbed-table-list-view';
import { I18nProvider } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';

import { coreServices } from '../services/kibana_services';
import { dashboardQueryClient } from '../services/dashboard_query_client';
import { getDashboardListingTabs } from './get_dashboard_listing_tabs';
import type { DashboardListingProps } from './types';

export const DashboardListing = ({
  children,
  initialFilter,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  getTabs,
}: DashboardListingProps) => {
  useExecutionContext(coreServices.executionContext, {
    type: 'application',
    page: 'list',
  });

  const history = useHistory();
  const { activeTab: activeTabParam } = useParams<{ activeTab?: string }>();

  const chromeStyle = useObservable(
    coreServices.chrome.getChromeStyle$(),
    coreServices.chrome.getChromeStyle()
  );
  const isProjectChrome = chromeStyle === 'project';

  const tabs = useMemo(
    () =>
      getDashboardListingTabs({
        goToDashboard,
        getDashboardUrl,
        useSessionStorageIntegration,
        initialFilter,
        getTabs,
      }),
    [goToDashboard, getDashboardUrl, useSessionStorageIntegration, initialFilter, getTabs]
  );

  const activeTabId = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTabParam)?.id ?? 'dashboards';
  }, [tabs, activeTabParam]);

  const changeActiveTab = useCallback(
    (tabId: string) => {
      history.push(`/list/${tabId}`);
    },
    [history]
  );

  const listingAppMenuConfig = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }
    return {
      layout: 'chromeBarV2',
      headerTabs: tabs.map((tab) => ({
        id: tab.id,
        label: tab.title,
        isSelected: tab.id === activeTabId,
        onClick: () => changeActiveTab(tab.id),
        testId: `dashboardListingTab-${tab.id}`,
      })),
    };
  }, [isProjectChrome, tabs, activeTabId, changeActiveTab]);

  return (
    <I18nProvider>
      <QueryClientProvider client={dashboardQueryClient}>
        {children}
        <AppMenu config={listingAppMenuConfig} setAppMenu={coreServices.chrome.setAppMenu} />
        <TabbedTableListView
          headingId="dashboardListingHeading"
          title={i18n.translate('dashboard.listing.title', {
            defaultMessage: 'Dashboards',
          })}
          tabs={tabs}
          activeTabId={activeTabId}
          changeActiveTab={changeActiveTab}
          hidePageHeader={isProjectChrome}
          restrictWidth={false}
        />
      </QueryClientProvider>
    </I18nProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardListing;
