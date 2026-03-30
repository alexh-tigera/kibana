/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPageHeaderProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import React, { useEffect, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ApmIndexSettingsContextProvider } from '../../../../context/apm_index_settings/apm_index_settings_context';
import { ApmServiceContextProvider } from '../../../../context/apm_service/apm_service_context';
import { useBreadcrumb } from '../../../../context/breadcrumbs/use_breadcrumb';
import { useSetApmServiceDetailAppMenuHeaderTabs } from '../../../../context/apm_service_detail_app_menu_header_tabs/apm_service_detail_app_menu_header_tabs_context';
import { ServiceAnomalyTimeseriesContextProvider } from '../../../../context/service_anomaly_timeseries/service_anomaly_timeseries_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { MobileSearchBar } from '../../../app/mobile/search_bar';
import { ServiceIcons } from '../../../shared/service_icons';
import { TechnicalPreviewBadge } from '../../../shared/technical_preview_badge';
import { ApmMainTemplate } from '../apm_main_template';
import { AnalyzeDataButton } from '../apm_service_template/analyze_data_button';
import { mapApmPageHeaderTabsToAppMenuHeaderTabs } from '../apm_service_template/map_apm_page_header_tabs_to_app_menu';

type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key:
    | 'overview'
    | 'transactions'
    | 'dependencies'
    | 'errors-and-crashes'
    | 'service-map'
    | 'logs'
    | 'alerts'
    | 'dashboards';
  hidden?: boolean;
};

interface Props {
  children: React.ReactChild;
  selectedTabKey: Tab['key'];
  searchBarOptions?: React.ComponentProps<typeof MobileSearchBar>;
}

export function MobileServiceTemplate(props: Props) {
  return (
    <ApmIndexSettingsContextProvider>
      <ApmServiceContextProvider>
        <TemplateWithContext {...props} />
      </ApmServiceContextProvider>
    </ApmIndexSettingsContextProvider>
  );
}

function TemplateWithContext({ children, selectedTabKey, searchBarOptions }: Props) {
  const {
    path: { serviceName },
    query,
    query: { rangeFrom, rangeTo, environment },
  } = useApmParams('/mobile-services/{serviceName}/*');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const router = useApmRouter();
  const { core } = useApmPluginContext();
  const chromeStyle = useObservable(core.chrome.getChromeStyle$(), core.chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';
  const setServiceDetailHeaderTabs = useSetApmServiceDetailAppMenuHeaderTabs();

  const tabs = useTabs({ selectedTabKey });
  const selectedTab = tabs?.find(({ isSelected }) => isSelected);

  const servicesLink = router.link('/services', {
    query: { ...query },
  });

  useBreadcrumb(
    () => {
      const inventoryCrumb = {
        title: i18n.translate('xpack.apm.mobileServices.breadcrumb.title', {
          defaultMessage: 'Service inventory',
        }),
        href: servicesLink,
      };
      const serviceNameCrumb = {
        title: serviceName,
        href: router.link('/mobile-services/{serviceName}', {
          path: { serviceName },
          query,
        }),
      };
      if (isProjectChrome) {
        return [inventoryCrumb, serviceNameCrumb];
      }
      return [
        inventoryCrumb,
        ...(selectedTab
          ? [
              serviceNameCrumb,
              {
                title: selectedTab.label,
                href: selectedTab.href,
              } as { title: string; href: string },
            ]
          : []),
      ];
    },
    [isProjectChrome, query, router, selectedTab, serviceName, servicesLink],
    {
      omitRootOnServerless: true,
    }
  );

  const mobileTabsSignatureRef = useRef('');

  useEffect(() => {
    if (!isProjectChrome) {
      setServiceDetailHeaderTabs(undefined);
      return;
    }
    const signature = tabs.map((t) => `${t.key}:${t.isSelected}:${t.href}`).join('|');
    if (mobileTabsSignatureRef.current === signature) {
      return;
    }
    mobileTabsSignatureRef.current = signature;
    setServiceDetailHeaderTabs(mapApmPageHeaderTabsToAppMenuHeaderTabs(tabs));
  }, [isProjectChrome, setServiceDetailHeaderTabs, tabs]);

  useEffect(() => {
    return () => {
      mobileTabsSignatureRef.current = '';
      setServiceDetailHeaderTabs(undefined);
    };
  }, [setServiceDetailHeaderTabs]);

  return (
    <ApmMainTemplate
      pageHeader={{
        tabs,
        pageTitle: (
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="l">
                    <h1 data-test-subj="apmMainTemplateHeaderServiceName">{serviceName}</h1>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ServiceIcons
                    serviceName={serviceName}
                    environment={environment}
                    start={start}
                    end={end}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <AnalyzeDataButton />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
    >
      <MobileSearchBar {...searchBarOptions} />
      <ServiceAnomalyTimeseriesContextProvider>{children}</ServiceAnomalyTimeseriesContextProvider>
    </ApmMainTemplate>
  );
}

function useTabs({ selectedTabKey }: { selectedTabKey: Tab['key'] }) {
  const { core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;
  const { isAlertingAvailable, canReadAlerts } = getAlertingCapabilities(plugins, capabilities);

  const router = useApmRouter();

  const {
    path: { serviceName },
    query: queryFromUrl,
  } = useApmParams(`/mobile-services/{serviceName}/${selectedTabKey}` as const);

  const query = omit(queryFromUrl, 'page', 'pageSize', 'sortField', 'sortDirection');

  const tabs: Tab[] = [
    {
      key: 'overview',
      href: router.link('/mobile-services/{serviceName}/overview', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.mobileServiceDetails.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
    },
    {
      key: 'transactions',
      href: router.link('/mobile-services/{serviceName}/transactions', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.mobileServiceDetails.transactionsTabLabel', {
        defaultMessage: 'Transactions',
      }),
    },
    {
      key: 'dependencies',
      href: router.link('/mobile-services/{serviceName}/dependencies', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.dependenciesTabLabel', {
        defaultMessage: 'Dependencies',
      }),
    },
    {
      key: 'errors-and-crashes',
      href: router.link('/mobile-services/{serviceName}/errors-and-crashes', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.mobileErrorsTabLabel', {
        defaultMessage: 'Errors & Crashes',
      }),
    },
    {
      key: 'service-map',
      href: router.link('/mobile-services/{serviceName}/service-map', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.mobileServiceDetails.serviceMapTabLabel', {
        defaultMessage: 'Service map',
      }),
    },
    {
      key: 'logs',
      href: router.link('/mobile-services/{serviceName}/logs', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.home.serviceLogsTabLabel', {
        defaultMessage: 'Logs',
      }),
      append: <TechnicalPreviewBadge icon="beaker" />,
    },
    {
      key: 'alerts',
      href: router.link('/mobile-services/{serviceName}/alerts', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.mobileServiceDetails.alertsTabLabel', {
        defaultMessage: 'Alerts',
      }),
      hidden: !(isAlertingAvailable && canReadAlerts),
    },
    {
      key: 'dashboards',
      href: router.link('/mobile-services/{serviceName}/dashboards', {
        path: { serviceName },
        query,
      }),
      append: <TechnicalPreviewBadge icon="beaker" />,
      label: i18n.translate('xpack.apm.mobileServiceDetails.dashboardsTabLabel', {
        defaultMessage: 'Dashboards',
      }),
    },
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ href, key, label, append }) => ({
      key,
      href,
      label,
      append,
      isSelected: key === selectedTabKey,
      'data-test-subj': `${key}Tab`,
    }));
}
