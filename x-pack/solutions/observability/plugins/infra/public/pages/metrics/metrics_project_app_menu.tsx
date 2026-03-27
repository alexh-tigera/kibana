/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { matchPath, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type {
  AppMenuConfig,
  AppMenuItemType,
  AppMenuPopoverItem,
} from '@kbn/core-chrome-app-menu-components';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import { getSurveyFeedbackURL, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import {
  MetricsAlertRuleFlyouts,
  useCustomThresholdMenu,
  useInfrastructureMenu,
  useMetricsMenu,
  type VisibleFlyoutType,
} from '../../alerting/common/components/metrics_alert_dropdown';
import { createFocusTrapProps } from '../../utils/create_focus_trap_props';
import { usePluginConfig } from '../../containers/plugin_config_context';
import type { InfraClientStartDeps } from '../../types';
import { OnboardingFlow } from '../../components/shared/templates/no_data_config';
import { useInfraMLCapabilitiesContext } from '../../containers/ml/infra_ml_capabilities';
import { useKibanaEnvironmentContext } from '../../hooks/use_kibana';
import { useMetricsProjectChromeBridge } from './metrics_project_chrome_bridge';

/**
 * Scoped app history can expose `/inventory`, `/`, ``, trailing slashes, or a `/metrics/...` prefix.
 * Normalize for onboarding, overflow items, and feedback URLs.
 */
function getNormalizedMetricsPathname(pathname: string): string {
  let p = pathname;
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  // Scoped `/inventory` or full path `.../app/metrics/inventory` (spaces / base path)
  const metricsIdx = p.indexOf('/metrics/');
  if (metricsIdx !== -1) {
    p = p.slice(metricsIdx + '/metrics'.length);
    if (p === '') {
      p = '/';
    }
  }
  return p;
}

function isMetricsInventoryRoute(pathname: string): boolean {
  const p = getNormalizedMetricsPathname(pathname);
  if (p === '' || p === '/') {
    return true;
  }
  return Boolean(matchPath({ path: '/inventory', end: true }, p));
}

function isMetricsExplorerRoute(pathname: string): boolean {
  const p = getNormalizedMetricsPathname(pathname);
  return Boolean(matchPath({ path: '/explorer', end: true }, p));
}

const FEEDBACK_LABEL = i18n.translate('xpack.infra.metricsAppMenu.feedback', {
  defaultMessage: 'Feedback',
});

const HOSTS_FEEDBACK_LINK = 'https://ela.st/host-feedback';
const METRICS_EXPLORER_FEEDBACK_URL = 'https://ela.st/survey-infra-metricsexplorer';
const INVENTORY_FEEDBACK_LINK = 'https://ela.st/survey-infra-inventory';
const KUBERNETES_FEEDBACK_LINK = 'https://ela.st/k8s-feedback';

function useMetricsAlertsOverflowMenuItem({
  onCreateRuleClick,
  canCreateAlerts,
  manageRulesHref,
  navigateToUrl,
  alertsDropdownEnabled,
}: {
  onCreateRuleClick: (flyoutType: VisibleFlyoutType) => void;
  canCreateAlerts: boolean;
  manageRulesHref: string | undefined;
  navigateToUrl: ((url: string) => Promise<void>) | undefined;
  alertsDropdownEnabled: boolean;
}): AppMenuItemType | null {
  const { featureFlags } = usePluginConfig();
  const infrastructureMenu = useInfrastructureMenu(onCreateRuleClick);
  const metricsMenu = useMetricsMenu(onCreateRuleClick);
  const customThresholdMenu = useCustomThresholdMenu(onCreateRuleClick);

  return useMemo(() => {
    if (!alertsDropdownEnabled) {
      return null;
    }

    const nestedItems: AppMenuPopoverItem[] = [];

    if (canCreateAlerts) {
      if (featureFlags.inventoryThresholdAlertRuleEnabled && infrastructureMenu.items.length > 0) {
        nestedItems.push({
          order: nestedItems.length + 1,
          id: 'metrics-app-menu-alerts-infrastructure',
          label: i18n.translate('xpack.infra.alerting.infrastructureDropdownMenu', {
            defaultMessage: 'Infrastructure',
          }),
          iconType: 'visBarVertical',
          items: [
            {
              order: 1,
              id: 'metrics-app-menu-alerts-create-inventory',
              label: i18n.translate('xpack.infra.alerting.createInventoryRuleButton', {
                defaultMessage: 'Create inventory rule',
              }),
              run: () => onCreateRuleClick('inventory'),
            },
          ],
        });
      }
      if (featureFlags.metricThresholdAlertRuleEnabled && metricsMenu.items.length > 0) {
        nestedItems.push({
          order: nestedItems.length + 1,
          id: 'metrics-app-menu-alerts-metrics',
          label: i18n.translate('xpack.infra.alerting.metricsDropdownMenu', {
            defaultMessage: 'Metrics',
          }),
          iconType: 'metricsApp',
          items: [
            {
              order: 1,
              id: 'metrics-app-menu-alerts-create-metric-threshold',
              label: i18n.translate('xpack.infra.alerting.createThresholdRuleButton', {
                defaultMessage: 'Create threshold rule',
              }),
              run: () => onCreateRuleClick('metricThreshold'),
            },
          ],
        });
      }
      if (featureFlags.customThresholdAlertsEnabled && customThresholdMenu.items.length > 0) {
        nestedItems.push({
          order: nestedItems.length + 1,
          id: 'metrics-app-menu-alerts-custom-threshold',
          label: i18n.translate('xpack.infra.alerting.customThresholdDropdownMenu', {
            defaultMessage: 'Create custom threshold rule',
          }),
          iconType: 'bell',
          run: () => onCreateRuleClick('customThreshold'),
        });
      }
    }

    nestedItems.push({
      order: nestedItems.length + 1,
      id: 'metrics-app-menu-alerts-manage-rules',
      label: i18n.translate('xpack.infra.alerting.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      iconType: 'tableOfContents',
      run: () => {
        if (manageRulesHref && navigateToUrl) {
          void navigateToUrl(manageRulesHref);
        }
      },
    });

    return {
      order: 10,
      id: 'metrics-app-menu-alerts',
      label: i18n.translate('xpack.infra.alerting.alertsButton', {
        defaultMessage: 'Alerts',
      }),
      iconType: 'bell',
      items: nestedItems,
      popoverWidth: 280,
      popoverTestId: 'metrics-alert-app-menu',
      testId: 'infrastructure-alerts-and-rules',
    };
  }, [
    alertsDropdownEnabled,
    canCreateAlerts,
    customThresholdMenu.items.length,
    featureFlags.customThresholdAlertsEnabled,
    featureFlags.inventoryThresholdAlertRuleEnabled,
    featureFlags.metricThresholdAlertRuleEnabled,
    infrastructureMenu.items.length,
    manageRulesHref,
    metricsMenu.items.length,
    navigateToUrl,
    onCreateRuleClick,
  ]);
}

export function MetricsProjectAppMenu() {
  const { services } = useKibana<InfraClientStartDeps & CoreStart>();
  const { chrome, application, uiSettings, inspector, notifications, share } = services;
  const { inspectorAdapters } = useInspectorContext();
  const config = usePluginConfig();
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useKibanaEnvironmentContext();
  const { isTopbarMenuVisible } = useInfraMLCapabilitiesContext();
  const { openAnomalyFlyoutFromAppMenu } = useMetricsProjectChromeBridge();

  const location = useLocation();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const [visibleFlyoutType, setVisibleFlyoutType] = useState<VisibleFlyoutType | null>(null);
  const closeFlyout = useCallback(() => setVisibleFlyoutType(null), []);

  const onCreateRuleClick = useCallback((flyoutType: VisibleFlyoutType) => {
    setVisibleFlyoutType(flyoutType);
  }, []);

  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const uiCapabilities = application?.capabilities;
  const canCreateAlerts = Boolean(uiCapabilities?.infrastructure?.save);
  const manageRulesLinkProps = services.observability.useRulesLink();

  const settingsLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'settings',
  });

  const onboardingFlow = useMemo((): OnboardingFlow => {
    const p = getNormalizedMetricsPathname(location.pathname);
    if (matchPath({ path: '/hosts', end: true }, p)) {
      return OnboardingFlow.Hosts;
    }
    if (matchPath({ path: '/detail/host/:node', end: true }, p)) {
      return OnboardingFlow.Hosts;
    }
    return OnboardingFlow.Infra;
  }, [location.pathname]);

  const addDataHref = onboardingLocator?.getRedirectUrl({
    category: onboardingFlow === OnboardingFlow.Hosts ? 'host' : undefined,
  });

  const alertsOverflowItem = useMetricsAlertsOverflowMenuItem({
    onCreateRuleClick,
    canCreateAlerts,
    manageRulesHref: manageRulesLinkProps.href,
    navigateToUrl: application?.navigateToUrl,
    alertsDropdownEnabled: config.featureFlags.alertsAndRulesDropdownEnabled,
  });

  const isFeedbackEnabled = notifications.feedback.isEnabled();

  const isInspectorEnabled = uiSettings?.get<boolean>(enableInspectEsQueries) ?? false;

  const overflowOnlyItems = useMemo((): AppMenuItemType[] => {
    const items: AppMenuItemType[] = [];

    const p = getNormalizedMetricsPathname(location.pathname);
    const showAnomalyOverflow =
      isTopbarMenuVisible &&
      (isMetricsInventoryRoute(location.pathname) ||
        Boolean(matchPath({ path: '/hosts', end: true }, p)) ||
        Boolean(matchPath({ path: '/detail/host/:node', end: true }, p)));

    if (showAnomalyOverflow) {
      items.push({
        order: 5,
        id: 'metrics-app-menu-anomaly',
        label: i18n.translate('xpack.infra.ml.anomalyDetectionButton', {
          defaultMessage: 'Anomaly detection',
        }),
        iconType: 'machineLearningApp',
        testId: 'openAnomalyFlyoutButton',
        run: () => {
          openAnomalyFlyoutFromAppMenu();
        },
      });
    }

    if (alertsOverflowItem) {
      items.push(alertsOverflowItem);
    }

    items.push({
      order: 20,
      id: 'metrics-app-menu-settings',
      label: i18n.translate('xpack.infra.metrics.settingsTabTitle', {
        defaultMessage: 'Settings',
      }),
      iconType: 'gear',
      separator: 'above',
      testId: 'metricsAppMenuSettings',
      href: settingsLinkProps.href!,
      target: '_self',
      run: () => {
        if (settingsLinkProps.href && application?.navigateToUrl) {
          void application.navigateToUrl(settingsLinkProps.href);
        }
      },
    });

    if (isFeedbackEnabled) {
      items.push({
        order: 30,
        id: 'metrics-app-menu-feedback',
        label: FEEDBACK_LABEL,
        iconType: 'popout',
        testId: 'metricsAppMenuFeedback',
        run: () => {
          const pathForFeedback = getNormalizedMetricsPathname(location.pathname);
          const isInventory = isMetricsInventoryRoute(location.pathname);
          const isHosts = Boolean(matchPath({ path: '/hosts', end: true }, pathForFeedback));
          const isExplorer = isMetricsExplorerRoute(location.pathname);

          let formUrl = INVENTORY_FEEDBACK_LINK;
          if (isExplorer) {
            formUrl = METRICS_EXPLORER_FEEDBACK_URL;
          } else if (isHosts) {
            formUrl = HOSTS_FEEDBACK_LINK;
          } else if (isInventory && location.search.includes('nodeType:pod')) {
            formUrl = KUBERNETES_FEEDBACK_LINK;
          }

          const url = getSurveyFeedbackURL({
            formUrl,
            kibanaVersion,
            isCloudEnv,
            isServerlessEnv,
            sanitizedPath: location.pathname,
          });
          window.open(url, '_blank', 'noopener,noreferrer');
        },
      });
    }

    if (isInspectorEnabled) {
      items.push({
        order: 40,
        id: 'metrics-app-menu-inspect',
        label: i18n.translate('xpack.infra.inspectButtonText', {
          defaultMessage: 'Inspect',
        }),
        iconType: 'inspect',
        testId: 'infraInspectHeaderLink',
        run: () => {
          inspector.open(inspectorAdapters);
        },
      });
    }

    return items;
  }, [
    alertsOverflowItem,
    application,
    inspector,
    inspectorAdapters,
    isFeedbackEnabled,
    isInspectorEnabled,
    isTopbarMenuVisible,
    kibanaVersion,
    isCloudEnv,
    isServerlessEnv,
    location.pathname,
    location.search,
    openAnomalyFlyoutFromAppMenu,
    settingsLinkProps.href,
  ]);

  const menuConfig = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome || !addDataHref) {
      return undefined;
    }

    return {
      layout: 'chromeBarV2',
      /** Hide for Inventory, Hosts, and Metrics Explorer — sibling routes under Metrics, not a drill-down hierarchy. */
      hideProjectHeaderBackButton: true,
      primaryActionItem: {
        id: 'metrics-add-data',
        label: i18n.translate('xpack.infra.metricsHeaderAddDataButtonLabel', {
          defaultMessage: 'Add data',
        }),
        iconType: 'plusInCircle',
        testId: 'metricsAppMenuAddData',
        href: addDataHref,
        target: '_self',
        run: () => {
          void application?.navigateToUrl(addDataHref);
        },
      },
      overflowOnlyItems,
    };
  }, [addDataHref, application, isProjectChrome, overflowOnlyItems]);

  if (!isProjectChrome || !menuConfig) {
    return null;
  }

  return (
    <>
      <AppMenu config={menuConfig} setAppMenu={chrome.setAppMenu} />
      <MetricsAlertRuleFlyouts
        visibleFlyoutType={visibleFlyoutType}
        onClose={closeFlyout}
        focusTrapProps={createFocusTrapProps(undefined)}
      />
    </>
  );
}
