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
import { i18n } from '@kbn/i18n';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import type { Index } from '../../../../../../common';
import {
  Section,
  type IndexDetailsTab,
  type IndexDetailsTabId,
} from '../../../../../../common/constants';
import { useAppContext } from '../../../../app_context';
import { resetIndexUrlParams } from './reset_index_url_params';

interface Props {
  tabs: IndexDetailsTab[];
  tab: IndexDetailsTabId;
  index: Index;
  search: string;
}
export const DetailsPageTab: FunctionComponent<Props> = ({ tabs, tab, index, search }) => {
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

  useEffect(() => {
    if (!isProjectChrome) {
      return;
    }
    const query = resetIndexUrlParams(search);
    const managementPath = `/data/index_management/${Section.Indices}${query ? `?${query}` : ''}`;
    const indicesHref = getUrlForApp('management', { path: managementPath });
    chrome.setBreadcrumbs(chrome.getBreadcrumbs(), {
      project: {
        value: [
          {
            text: i18n.translate('xpack.idxMgmt.breadcrumb.indicesLabel', {
              defaultMessage: 'Indices',
            }),
            href: indicesHref,
          },
          { text: index.name },
        ],
      },
    });
  }, [chrome, getUrlForApp, index.name, isProjectChrome, search]);

  useEffect(() => {
    return () => {
      if (chrome.getChromeStyle() === 'project') {
        chrome.setBreadcrumbs(chrome.getBreadcrumbs(), { project: { value: [] } });
      }
    };
  }, [chrome]);

  return selectedTab.renderTabContent({ index, getUrlForApp, euiTheme });
};
