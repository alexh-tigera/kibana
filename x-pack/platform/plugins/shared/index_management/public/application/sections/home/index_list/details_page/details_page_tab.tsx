/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import { useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { EuiBreadcrumb } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import type { Index } from '../../../../../../common';
import { type IndexDetailsTab, type IndexDetailsTabId } from '../../../../../../common/constants';
import { useAppContext } from '../../../../app_context';

interface Props {
  tabs: IndexDetailsTab[];
  tab: IndexDetailsTabId;
  index: Index;
}
export const DetailsPageTab: FunctionComponent<Props> = ({ tabs, tab, index }) => {
  const effectiveTab = tabs[0]; // Set the overview tab as the fallback/default tab
  const selectedTab = tabs.find((tabConfig) => tabConfig.id === tab) ?? effectiveTab;
  const {
    core: { getUrlForApp, chrome },
  } = useAppContext();

  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    const breadcrumb: EuiBreadcrumb = isProjectChrome
      ? { text: index.name }
      : selectedTab?.breadcrumb ?? { text: selectedTab?.name };
    breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.indexDetails, breadcrumb);
  }, [selectedTab, index.name, isProjectChrome]);

  return selectedTab.renderTabContent({ index, getUrlForApp, euiTheme });
};
