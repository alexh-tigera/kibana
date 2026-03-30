/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { getSurveyFeedbackURL } from '@kbn/observability-shared-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import { ApmRuleType } from '@kbn/rule-data-utils';
import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useLocatorUrl } from '@kbn/share-plugin/public';
import { useApmHeaderFlyouts } from '../context/apm_header_flyouts/apm_header_flyouts_context';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { getLegacyApmHref } from '../components/shared/links/apm/apm_link_hooks';
import { getAlertingCapabilities } from '../components/alerting/utils/get_alerting_capabilities';
import { useManageSlosUrl } from './use_manage_slos_url';
import { useApmRouter } from './use_apm_router';
import { ServiceIconsHeaderBadges } from '../components/shared/service_icons';
import { getDateRange } from '../context/url_params_context/helpers';
import { useMaybeApmParams } from './use_apm_params';
import {
  getServiceGroupAppMenuHeaderTabs,
  type ServiceGroupTabKey,
} from './use_service_group_tabs';
import { getPathForFeedback } from '../utils/get_path_for_feedback';
import { getStorageExplorerFeedbackHref } from '../components/app/storage_explorer/get_storage_explorer_links';
import { useApmServiceDetailAppMenuHeaderTabs } from '../context/apm_service_detail_app_menu_header_tabs/apm_service_detail_app_menu_header_tabs_context';

const APM_FEEDBACK_LINK = 'https://ela.st/services-feedback';

const addDataLabel = i18n.translate('xpack.apm.addDataButtonLabel', {
  defaultMessage: 'Add data',
});
const storageExplorerLabel = i18n.translate('xpack.apm.storageExplorerLinkLabel', {
  defaultMessage: 'Storage explorer',
});
const alertsLabel = i18n.translate('xpack.apm.home.alertsMenu.alerts', {
  defaultMessage: 'Alerts',
});
const sloLabel = i18n.translate('xpack.apm.home.sloMenu.slosHeaderLink', {
  defaultMessage: 'SLOs',
});
const settingsLabel = i18n.translate('xpack.apm.settingsLinkLabel', {
  defaultMessage: 'Settings',
});
const inspectLabel = i18n.translate('xpack.apm.inspectButtonText', {
  defaultMessage: 'Inspect',
});
const feedbackLabel = i18n.translate('xpack.apm.appMenu.feedback', {
  defaultMessage: 'Feedback',
});

const createThresholdAlertLabel = i18n.translate('xpack.apm.home.alertsMenu.createThresholdAlert', {
  defaultMessage: 'Create threshold rule',
});
const createAnomalyAlertAlertLabel = i18n.translate(
  'xpack.apm.home.alertsMenu.createAnomalyAlert',
  { defaultMessage: 'Create anomaly rule' }
);
const transactionDurationLabel = i18n.translate('xpack.apm.home.alertsMenu.transactionDuration', {
  defaultMessage: 'Latency',
});
const transactionErrorRateLabel = i18n.translate('xpack.apm.home.alertsMenu.transactionErrorRate', {
  defaultMessage: 'Failed transaction rate',
});
const errorCountLabel = i18n.translate('xpack.apm.home.alertsMenu.errorCount', {
  defaultMessage: ' Create error count rule',
});
const createLatencySloLabel = i18n.translate('xpack.apm.home.sloMenu.createLatencySlo', {
  defaultMessage: 'Create APM latency SLO',
});
const createAvailabilitySloLabel = i18n.translate('xpack.apm.home.sloMenu.createAvailabilitySlo', {
  defaultMessage: 'Create APM availability SLO',
});
const manageSlosLabel = i18n.translate('xpack.apm.home.sloMenu.manageSlos', {
  defaultMessage: 'Manage SLOs',
});

/**
 * Match service inventory / service map home routes. Uses the last path segment so it works when
 * the scoped pathname includes a prefix (e.g. project / space segments), not only `/services`.
 */
function getServiceGroupTabKeyFromPathname(pathname: string): ServiceGroupTabKey | null {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last === 'services') {
    return 'service-inventory';
  }
  if (last === 'service-map') {
    return 'service-map';
  }
  return null;
}

export function useApmAppMenuConfig(): AppMenuConfig {
  const serviceDetailHeaderTabsFromContext = useApmServiceDetailAppMenuHeaderTabs();
  const { pathname } = useLocation();
  const { search } = window.location;
  const { core, plugins, config, share, inspector, kibanaEnvironment, observability } =
    useApmPluginContext();
  const { openAlertRuleType, openSloIndicatorType } = useApmHeaderFlyouts();
  const router = useApmRouter();
  const { application, http } = core;
  const { basePath } = http;
  const { capabilities } = application;
  const { featureFlags } = config;
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = kibanaEnvironment;
  const canReadMlJobs = !!capabilities.ml?.canGetJobs;
  const { isAlertingAvailable, canReadAlerts, canSaveAlerts } = getAlertingCapabilities(
    plugins,
    capabilities
  );
  const canSaveApmAlerts = !!capabilities.apm.save && canSaveAlerts;
  const canReadSlos = !!capabilities.slo?.read;
  const canWriteSlos = !!capabilities.slo?.write;
  const isSloAvailable = canReadSlos || canWriteSlos;
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const addDataUrl = useLocatorUrl(onboardingLocator, { category: 'application' });
  const manageSlosUrl = useManageSlosUrl();
  const rulesLinkProps = observability.useRulesLink();
  const manageRulesHref = rulesLinkProps?.href;
  const { inspectorAdapters } = useInspectorContext();
  const isInspectorEnabled = core.uiSettings.get<boolean>(enableInspectEsQueries) ?? false;

  const servicesParams = useMaybeApmParams('/services');
  const serviceMapParams = useMaybeApmParams('/service-map');
  const classicServiceDetailParams = useMaybeApmParams('/services/{serviceName}/*');
  const mobileServiceDetailParams = useMaybeApmParams('/mobile-services/{serviceName}/*');
  const serviceDetailParams = classicServiceDetailParams ?? mobileServiceDetailParams;

  // Derive ISO bounds from the same decoded router `query` as `useApmParams` (not UrlParamsContext).
  // The context provider can lag or omit `start`/`end` on some renders, which hid project header badges.
  const servicePageRangeForIcons = useMemo(() => {
    const rangeFrom = serviceDetailParams?.query.rangeFrom;
    const rangeTo = serviceDetailParams?.query.rangeTo;
    if (!rangeFrom || !rangeTo) {
      return { start: undefined as string | undefined, end: undefined as string | undefined };
    }
    return getDateRange({ state: {}, rangeFrom, rangeTo });
  }, [serviceDetailParams?.query.rangeFrom, serviceDetailParams?.query.rangeTo]);

  return useMemo((): AppMenuConfig => {
    function apmHref(path: string) {
      return getLegacyApmHref({ basePath, path, search });
    }

    const overflowOnlyItems: AppMenuItemType[] = [];
    let order = 1;

    overflowOnlyItems.push({
      order: order++,
      id: 'apm-overflow-add-data',
      label: addDataLabel,
      iconType: 'plusInCircle',
      href: addDataUrl,
      target: '_blank',
      run: () => {
        window.open(addDataUrl, '_blank');
      },
    });

    if (isSloAvailable) {
      const sloItems: AppMenuItemType[] = [];
      let sloOrder = 1;
      if (canWriteSlos) {
        sloItems.push(
          {
            order: sloOrder++,
            id: 'apm-overflow-slo-latency',
            label: createLatencySloLabel,
            iconType: 'visGauge',
            run: () => {
              openSloIndicatorType('sli.apm.transactionDuration');
            },
          },
          {
            order: sloOrder++,
            id: 'apm-overflow-slo-availability',
            label: createAvailabilitySloLabel,
            iconType: 'visGauge',
            run: () => {
              openSloIndicatorType('sli.apm.transactionErrorRate');
            },
          }
        );
      }
      if (canReadSlos && manageSlosUrl) {
        sloItems.push({
          order: sloOrder++,
          id: 'apm-overflow-slo-manage',
          label: manageSlosLabel,
          iconType: 'tableOfContents',
          href: manageSlosUrl,
          target: '_self',
          run: () => {
            void application.navigateToUrl(manageSlosUrl);
          },
        });
      }
      if (sloItems.length > 0) {
        overflowOnlyItems.push({
          order: order++,
          id: 'apm-overflow-slos',
          label: sloLabel,
          iconType: 'visGauge',
          items: sloItems,
        });
      }
    }

    if (isAlertingAvailable) {
      const alertItems: AppMenuItemType[] = [];
      let alertOrder = 1;
      if (canSaveApmAlerts) {
        const thresholdChildren: AppMenuItemType[] = [
          {
            order: 1,
            id: 'apm-overflow-alert-latency',
            label: transactionDurationLabel,
            iconType: 'visLine',
            run: () => {
              openAlertRuleType(ApmRuleType.TransactionDuration);
            },
          },
          {
            order: 2,
            id: 'apm-overflow-alert-failed-rate',
            label: transactionErrorRateLabel,
            iconType: 'visLine',
            run: () => {
              openAlertRuleType(ApmRuleType.TransactionErrorRate);
            },
          },
        ];
        alertItems.push({
          order: alertOrder++,
          id: 'apm-overflow-alert-threshold',
          label: createThresholdAlertLabel,
          iconType: 'bell',
          items: thresholdChildren,
        });
        if (canReadMlJobs) {
          alertItems.push({
            order: alertOrder++,
            id: 'apm-overflow-alert-anomaly',
            label: createAnomalyAlertAlertLabel,
            iconType: 'machineLearningApp',
            run: () => {
              openAlertRuleType(ApmRuleType.Anomaly);
            },
          });
        }
        alertItems.push({
          order: alertOrder++,
          id: 'apm-overflow-alert-error-count',
          label: errorCountLabel,
          iconType: 'bell',
          run: () => {
            openAlertRuleType(ApmRuleType.ErrorCount);
          },
        });
      }
      if (canReadAlerts && manageRulesHref) {
        alertItems.push({
          order: alertOrder++,
          id: 'apm-overflow-alert-manage',
          label: i18n.translate('xpack.apm.home.alertsMenu.viewActiveAlerts', {
            defaultMessage: 'Manage rules',
          }),
          iconType: 'tableOfContents',
          href: manageRulesHref,
          target: '_self',
          run: () => {
            void application.navigateToUrl(manageRulesHref);
          },
        });
      }
      if (alertItems.length > 0) {
        overflowOnlyItems.push({
          order: order++,
          id: 'apm-overflow-alerts',
          label: alertsLabel,
          iconType: 'bell',
          items: alertItems,
        });
      }
    }

    if (featureFlags.storageExplorerAvailable) {
      const storageHref = apmHref('/storage-explorer');
      overflowOnlyItems.push({
        order: order++,
        id: 'apm-overflow-storage-explorer',
        label: storageExplorerLabel,
        iconType: 'storage',
        href: storageHref,
        target: '_self',
        run: () => {
          void application.navigateToUrl(storageHref);
        },
      });
    }

    const settingsHref = apmHref('/settings');
    overflowOnlyItems.push({
      order: order++,
      id: 'apm-overflow-settings',
      label: settingsLabel,
      iconType: 'gear',
      href: settingsHref,
      target: '_self',
      separator: 'above',
      run: () => {
        void application.navigateToUrl(settingsHref);
      },
    });

    if (isInspectorEnabled) {
      overflowOnlyItems.push({
        order: order++,
        id: 'apm-overflow-inspect',
        label: inspectLabel,
        iconType: 'inspect',
        run: () => {
          if (inspectorAdapters) {
            inspector.open(inspectorAdapters);
          }
        },
      });
    }

    const isFeedbackEnabled = core.notifications.feedback.isEnabled();
    const isStorageExplorerFeedback =
      pathname.includes('/storage-explorer') && featureFlags.storageExplorerAvailable;
    const sanitizedPath = getPathForFeedback(pathname);
    const feedbackHref = isStorageExplorerFeedback
      ? getStorageExplorerFeedbackHref()
      : getSurveyFeedbackURL({
          formUrl: APM_FEEDBACK_LINK,
          kibanaVersion,
          isCloudEnv,
          isServerlessEnv,
          sanitizedPath,
        });

    if (isFeedbackEnabled) {
      overflowOnlyItems.push({
        order: order++,
        id: 'apm-overflow-feedback',
        label: feedbackLabel,
        iconType: 'popout',
        href: feedbackHref,
        target: '_blank',
        testId: 'apmOverflowFeedbackLink',
        run: () => {
          window.open(feedbackHref, '_blank');
        },
      });
    }

    const serviceGroupQuery = servicesParams?.query ?? serviceMapParams?.query;
    const tabKey = getServiceGroupTabKeyFromPathname(pathname);
    let headerTabs: ReturnType<typeof getServiceGroupAppMenuHeaderTabs> | undefined;
    if (serviceDetailHeaderTabsFromContext?.length) {
      headerTabs = serviceDetailHeaderTabsFromContext;
    } else if (tabKey && serviceGroupQuery) {
      try {
        headerTabs = getServiceGroupAppMenuHeaderTabs({
          router,
          query: serviceGroupQuery,
          selectedTab: tabKey,
        });
      } catch {
        headerTabs = undefined;
      }
    }

    const serviceTechnologyHeaderBadges =
      serviceDetailParams?.path.serviceName &&
      servicePageRangeForIcons.start &&
      servicePageRangeForIcons.end
        ? [
            <ServiceIconsHeaderBadges
              key="apm-service-tech-badges"
              environment={serviceDetailParams.query.environment}
              serviceName={serviceDetailParams.path.serviceName}
              start={servicePageRangeForIcons.start}
              end={servicePageRangeForIcons.end}
            />,
          ]
        : undefined;

    return {
      layout: 'chromeBarV2',
      overflowOnlyItems,
      ...(headerTabs?.length ? { headerTabs } : {}),
      ...(serviceTechnologyHeaderBadges ? { headerBadges: serviceTechnologyHeaderBadges } : {}),
    };
  }, [
    addDataUrl,
    application,
    canReadAlerts,
    canReadMlJobs,
    canSaveApmAlerts,
    canReadSlos,
    canWriteSlos,
    core.notifications,
    featureFlags.storageExplorerAvailable,
    inspector,
    inspectorAdapters,
    isAlertingAvailable,
    isInspectorEnabled,
    isSloAvailable,
    kibanaVersion,
    isCloudEnv,
    isServerlessEnv,
    manageRulesHref,
    manageSlosUrl,
    openAlertRuleType,
    openSloIndicatorType,
    pathname,
    router,
    search,
    basePath,
    serviceDetailHeaderTabsFromContext,
    serviceDetailParams?.path.serviceName,
    serviceDetailParams?.query.environment,
    servicePageRangeForIcons.end,
    servicePageRangeForIcons.start,
    servicesParams?.query,
    serviceMapParams?.query,
  ]);
}
