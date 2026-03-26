/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the "Elastic License
 * 2.0".
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { RECORDS_FIELD, createExploratoryViewUrl } from '@kbn/exploratory-view-plugin/public';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { SERVICE_NAME } from '../../../../../common/elasticsearch_fieldnames';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { useUxPluginContext } from '../../../../context/use_ux_plugin_context';

const ANALYZE_DATA = i18n.translate('xpack.ux.analyzeDataButtonLabel', {
  defaultMessage: 'Explore data',
});

const ANALYZE_MESSAGE = i18n.translate('xpack.ux.analyzeDataButtonLabel.message', {
  defaultMessage:
    'Go to Explore Data, where you can select and filter result data in any dimension and look for the cause or impact of performance problems.',
});

export function UxProjectAppMenu() {
  const { http, application, inspector, uiSettings, chrome } = useKibanaServices();
  const { isDev = false } = useUxPluginContext();
  const { urlParams } = useLegacyUrlParams();
  const { rangeTo, rangeFrom, serviceName } = urlParams;
  const { inspectorAdapters } = useInspectorContext();

  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const config = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const uxExploratoryViewLink = createExploratoryViewUrl(
      {
        reportType: 'kpi-over-time',
        allSeries: [
          {
            dataType: 'ux',
            name: `${serviceName}-page-views`,
            time: { from: rangeFrom!, to: rangeTo! },
            reportDefinitions: {
              [SERVICE_NAME]: serviceName ? [serviceName] : [],
            },
            selectedMetricField: RECORDS_FIELD,
          },
        ],
      },
      http.basePath.get()
    );

    const addDataHref = application.getUrlForApp('/apm/tutorial');

    const overflowOnlyItems: AppMenuItemType[] = [
      {
        order: 1,
        id: 'ux-overflow-add-data',
        label: i18n.translate('xpack.ux.addDataButtonLabel', {
          defaultMessage: 'Add data',
        }),
        iconType: 'indexOpen',
        href: addDataHref,
        target: '_self',
        testId: 'uxAddDataAppMenu',
        run: () => {
          void application.navigateToUrl(addDataHref);
        },
      },
    ];

    const isInspectorEnabled = uiSettings.get<boolean>(enableInspectEsQueries) ?? false;
    if (isInspectorEnabled || isDev) {
      overflowOnlyItems.push({
        order: 2,
        id: 'ux-overflow-inspect',
        label: i18n.translate('xpack.ux.inspectButtonText', {
          defaultMessage: 'Inspect',
        }),
        iconType: 'inspect',
        testId: 'uxInspectAppMenu',
        run: () => {
          inspector.open(inspectorAdapters);
        },
      });
    }

    return {
      layout: 'chromeBarV2',
      secondaryActionItem: {
        id: 'ux-explore-data',
        label: ANALYZE_DATA,
        iconType: 'inspect',
        href: uxExploratoryViewLink,
        target: '_self',
        testId: 'uxAnalyzeBtn',
        tooltipContent: ANALYZE_MESSAGE,
        run: () => {
          void application.navigateToUrl(uxExploratoryViewLink);
        },
      },
      overflowOnlyItems,
    };
  }, [
    application,
    http,
    inspector,
    inspectorAdapters,
    isDev,
    isProjectChrome,
    rangeFrom,
    rangeTo,
    serviceName,
    uiSettings,
  ]);

  if (!isProjectChrome || !config) {
    return null;
  }

  return <AppMenu config={config} setAppMenu={chrome.setAppMenu} />;
}
