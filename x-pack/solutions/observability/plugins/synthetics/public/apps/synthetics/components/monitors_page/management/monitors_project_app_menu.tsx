/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useObservable from 'react-use/lib/useObservable';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSelect, EuiWrappingPopover } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type {
  AppMenuConfig,
  AppMenuItemType,
  AppMenuPopoverItem,
  AppMenuRunActionParams,
  AppMenuSecondaryActionItem,
} from '@kbn/core-chrome-app-menu-components';
import { createExploratoryViewUrl } from '@kbn/exploratory-view-plugin/public';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { LastRefreshed } from '../../common/components/last_refreshed';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';
import { useLocations } from '../../../hooks/use_locations';
import { usePrivateLocationsAPI } from '../../settings/private_locations/hooks/use_locations_api';
import { AddOrEditLocationFlyout } from '../../settings/private_locations/add_or_edit_location_flyout';
import type { NewLocation } from '../../settings/private_locations/add_or_edit_location_flyout';
import { useSyntheticsRules } from '../../alerts/hooks/use_synthetics_rules';
import {
  CREATE_STATUS_RULE,
  CREATE_TLS_RULE_NAME,
  EDIT_STATUS_RULE,
  EDIT_TLS_RULE_NAME,
} from '../../alerts/toggle_alert_flyout_button';
import {
  STATUS_RULE_NAME,
  TLS_RULE_NAME,
  ToggleFlyoutTranslations,
} from '../../alerts/hooks/translations';
import {
  CERTIFICATES_ROUTE,
  GETTING_STARTED_ROUTE,
  MONITORS_ROUTE,
  SETTINGS_ROUTE,
} from '../../../../../../common/constants';
import { stringifyUrlParams } from '../../../utils/url_params';
import { SYNTHETICS_STATUS_RULE, SYNTHETICS_TLS_RULE } from '../../../../../../common/constants/synthetics_alerts';
import type { ClientPluginsStart } from '../../../../../plugin';
import {
  selectAlertFlyoutVisibility,
  selectMonitorListState,
  setAlertFlyoutVisible,
} from '../../../state';
import { setIsPrivateLocationFlyoutVisible } from '../../../state/private_locations/actions';
import { selectPrivateLocationFlyoutVisible } from '../../../state/private_locations/selectors';
import { selectAgentPolicies } from '../../../state/agent_policies';
import { CLIENT_DEFAULTS_SYNTHETICS } from '../../../../../../common/constants/synthetics/client_defaults';
import { REFRESH_CERT } from '../../certificates/translations';

const CREATE_LOCATION_LABEL = i18n.translate('xpack.synthetics.gettingStarted.createLocationLabel', {
  defaultMessage: 'Create location',
});

const ANALYZE_DATA = i18n.translate('xpack.synthetics.analyzeDataButtonLabel', {
  defaultMessage: 'Explore data',
});

const ANALYZE_MESSAGE = i18n.translate('xpack.synthetics.analyzeDataButtonLabel.message', {
  defaultMessage:
    'Go to Explore Data, where you can select and filter result data in any dimension and look for the cause or impact of performance problems.',
});

const SETTINGS_LABEL = i18n.translate('xpack.synthetics.page_header.settingsLink', {
  defaultMessage: 'Settings',
});

const OFF_LABEL = i18n.translate('xpack.synthetics.projectAppMenu.autoRefreshOff', {
  defaultMessage: 'Off',
});

const AUTO_REFRESH_FORM_LABEL = i18n.translate('xpack.synthetics.projectAppMenu.autoRefreshFormLabel', {
  defaultMessage: 'Auto refresh',
});

const OFF_SELECT_VALUE = 'off';

/** Interval options in seconds; matches EUI auto-refresh presets. */
const AUTO_REFRESH_INTERVALS_SECONDS = [5, 10, 30, 45, 60, 300, 900, 1800, 3600] as const;

const formatIntervalLabel = (seconds: number): string => {
  if (seconds < 60) {
    return i18n.translate('xpack.synthetics.projectAppMenu.autoRefreshIntervalSeconds', {
      defaultMessage: '{count} seconds',
      values: { count: seconds },
    });
  }
  if (seconds < 3600) {
    return i18n.translate('xpack.synthetics.projectAppMenu.autoRefreshIntervalMinutes', {
      defaultMessage: '{count} minutes',
      values: { count: Math.round(seconds / 60) },
    });
  }
  return i18n.translate('xpack.synthetics.projectAppMenu.autoRefreshIntervalHours', {
    defaultMessage: '{count} hours',
    values: { count: Math.round(seconds / 3600) },
  });
};

const formatAutoRefreshButtonLabel = (refreshPaused: boolean, refreshInterval: number): string => {
  if (refreshPaused) {
    return OFF_LABEL;
  }
  const sec = refreshInterval || CLIENT_DEFAULTS_SYNTHETICS.AUTOREFRESH_INTERVAL_SECONDS;
  return formatIntervalLabel(sec);
};

export function MonitorsProjectAppMenu() {
  const dispatch = useDispatch();
  const history = useHistory();
  const {
    services: { application, chrome, inspector, uiSettings, observability },
  } = useKibana<ClientPluginsStart>();

  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';
  const isMonitorsListRoute = Boolean(useRouteMatch({ path: MONITORS_ROUTE, exact: true })?.isExact);
  const isGettingStartedRoute = Boolean(
    useRouteMatch({ path: GETTING_STARTED_ROUTE, exact: true })?.isExact
  );
  const isCertificatesRoute = Boolean(
    useRouteMatch({ path: CERTIFICATES_ROUTE, exact: true })?.isExact
  );
  const isMonitorsProjectAppMenuRoute =
    isMonitorsListRoute || isGettingStartedRoute || isCertificatesRoute;

  const projectMenuActive = isProjectChrome && isMonitorsProjectAppMenuRoute;
  const { EditAlertFlyout, NewRuleFlyout, loading, defaultRules } =
    useSyntheticsRules(projectMenuActive);

  const { basePath, isDev } = useSyntheticsSettingsContext();
  const params = useGetUrlParams();
  const { dateRangeStart, dateRangeEnd } = params;
  const { inspectorAdapters } = useInspectorContext();

  const {
    refreshApp,
    refreshInterval,
    refreshPaused,
    setRefreshInterval,
    setRefreshPaused,
  } = useSyntheticsRefreshContext();

  const [isAutoRefreshPopoverOpen, setIsAutoRefreshPopoverOpen] = useState(false);
  const [autoRefreshAnchorEl, setAutoRefreshAnchorEl] = useState<HTMLElement | null>(null);

  const closeAutoRefreshPopover = useCallback(() => {
    setIsAutoRefreshPopoverOpen(false);
  }, []);

  const openAutoRefreshPopover = useCallback((params?: AppMenuRunActionParams) => {
    const el = params?.triggerElement;
    if (el) {
      setAutoRefreshAnchorEl(el);
      setIsAutoRefreshPopoverOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!projectMenuActive) {
      setIsAutoRefreshPopoverOpen(false);
      setAutoRefreshAnchorEl(null);
    }
  }, [projectMenuActive]);

  const autoRefreshSelectOptions = useMemo(() => {
    const presets = AUTO_REFRESH_INTERVALS_SECONDS.map((seconds) => ({
      value: String(seconds),
      text: formatIntervalLabel(seconds),
    }));
    const intervalSec = refreshInterval || CLIENT_DEFAULTS_SYNTHETICS.AUTOREFRESH_INTERVAL_SECONDS;
    const hasCustomInterval =
      !refreshPaused &&
      !AUTO_REFRESH_INTERVALS_SECONDS.some((seconds) => seconds === intervalSec);
    if (hasCustomInterval) {
      presets.push({
        value: String(intervalSec),
        text: formatIntervalLabel(intervalSec),
      });
    }
    return [{ value: OFF_SELECT_VALUE, text: OFF_LABEL }, ...presets];
  }, [refreshInterval, refreshPaused]);

  const autoRefreshSelectValue = refreshPaused
    ? OFF_SELECT_VALUE
    : String(refreshInterval || CLIENT_DEFAULTS_SYNTHETICS.AUTOREFRESH_INTERVAL_SECONDS);

  const onAutoRefreshSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const v = event.target.value;
      if (v === OFF_SELECT_VALUE) {
        setRefreshPaused(true);
      } else {
        setRefreshPaused(false);
        setRefreshInterval(Number(v));
      }
      closeAutoRefreshPopover();
    },
    [closeAutoRefreshPopover, setRefreshInterval, setRefreshPaused]
  );

  const { onCreateLocationAPI, privateLocations } = usePrivateLocationsAPI();
  const { locations, loading: allLocationsLoading } = useLocations();
  const { loading: agentPoliciesLoading } = useSelector(selectAgentPolicies);
  const gettingStartedPageLoading = allLocationsLoading || agentPoliciesLoading;
  const hasNoLocations = !allLocationsLoading && locations.length === 0;
  /** Matches {@link GettingStartedPage} / {@link GettingStartedOnPrem}; that subtree already mounts the flyout. */
  const locationFlyoutMountedInGettingStartedOnPrem =
    isGettingStartedRoute && !gettingStartedPageLoading && hasNoLocations;

  const isPrivateLocationFlyoutVisible = useSelector(selectPrivateLocationFlyoutVisible);
  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);
  const { loaded, data: monitors } = useSelector(selectMonitorListState);
  const hasMonitors = Boolean(loaded && monitors.absoluteTotal && monitors.absoluteTotal > 0);
  const hasUptimeWrite = application?.capabilities.uptime?.save ?? false;

  const manageRulesUrl = observability.useRulesLink();

  const syntheticExploratoryViewLink = createExploratoryViewUrl(
    {
      reportType: 'kpi-over-time',
      allSeries: [
        {
          dataType: 'synthetics',
          seriesType: 'area',
          selectedMetricField: 'monitor.duration.us',
          time: { from: dateRangeStart, to: dateRangeEnd },
          breakdown: 'monitor.type',
          reportDefinitions: {
            'monitor.name': [],
            'url.full': ['ALL_VALUES'],
          },
          name: 'All monitors response duration',
        },
      ],
    },
    basePath
  );

  const onCreateLocationSubmit = useCallback(
    (formData: NewLocation) => {
      onCreateLocationAPI(formData);
    },
    [onCreateLocationAPI]
  );

  const closeLocationFlyout = useCallback(() => {
    dispatch(setIsPrivateLocationFlyoutVisible(false));
  }, [dispatch]);

  const openLocationFlyout = useCallback(() => {
    dispatch(setIsPrivateLocationFlyoutVisible(true));
  }, [dispatch]);

  const statusRuleExists = Boolean(defaultRules?.statusRule);
  const tlsRuleExists = Boolean(defaultRules?.tlsRule);

  const noWritePermissionsTooltipContent = i18n.translate(
    'xpack.synthetics.alertDropdown.noPermissions',
    {
      defaultMessage: 'You do not have sufficient permissions to perform this action.',
    }
  );

  const statusRuleNotAvailableTooltipContent = i18n.translate(
    'xpack.synthetics.alerts.statusRuleNotAvailableTooltip',
    {
      defaultMessage: 'Status rule does not exist. Create the rule before editing.',
    }
  );

  const tlsRuleNotAvailableTooltipContent = i18n.translate(
    'xpack.synthetics.alerts.tlsRuleNotAvailableTooltip',
    {
      defaultMessage: 'TLS rule does not exist. Create the rule before editing.',
    }
  );

  const alertsOverflowItem = useMemo((): AppMenuItemType => {
    const statusPanelItems: AppMenuPopoverItem[] = [
      {
        order: 1,
        id: 'synthetics-create-status-rule',
        label: CREATE_STATUS_RULE,
        iconType: 'plusInCircle',
        testId: 'createNewStatusRule',
        run: () => {
          dispatch(setAlertFlyoutVisible({ id: SYNTHETICS_STATUS_RULE, isNewRuleFlyout: true }));
        },
      },
      {
        order: 2,
        id: 'synthetics-edit-status-rule',
        label: EDIT_STATUS_RULE,
        iconType: 'bell',
        testId: 'editDefaultStatusRule',
        isLoading: loading,
        disableButton: () => !hasUptimeWrite || loading || !statusRuleExists,
        tooltipContent: !hasUptimeWrite
          ? noWritePermissionsTooltipContent
          : !statusRuleExists
          ? statusRuleNotAvailableTooltipContent
          : undefined,
        run: () => {
          dispatch(setAlertFlyoutVisible({ id: SYNTHETICS_STATUS_RULE, isNewRuleFlyout: false }));
        },
      },
    ];

    const tlsPanelItems: AppMenuPopoverItem[] = [
      {
        order: 1,
        id: 'synthetics-create-tls-rule',
        label: CREATE_TLS_RULE_NAME,
        iconType: 'plusInCircle',
        testId: 'createNewTLSRule',
        run: () => {
          dispatch(setAlertFlyoutVisible({ id: SYNTHETICS_TLS_RULE, isNewRuleFlyout: true }));
        },
      },
      {
        order: 2,
        id: 'synthetics-edit-tls-rule',
        label: EDIT_TLS_RULE_NAME,
        iconType: 'bell',
        testId: 'editDefaultTlsRule',
        isLoading: loading,
        disableButton: () => !hasUptimeWrite || loading || !tlsRuleExists,
        tooltipContent: !hasUptimeWrite
          ? noWritePermissionsTooltipContent
          : !tlsRuleExists
          ? tlsRuleNotAvailableTooltipContent
          : undefined,
        run: () => {
          dispatch(setAlertFlyoutVisible({ id: SYNTHETICS_TLS_RULE, isNewRuleFlyout: false }));
        },
      },
    ];

    const rootItems: AppMenuPopoverItem[] = [
      {
        order: 1,
        id: 'synthetics-alerts-status-rule-nav',
        label: STATUS_RULE_NAME,
        testId: 'manageStatusRuleName',
        items: statusPanelItems,
      },
      {
        order: 2,
        id: 'synthetics-alerts-tls-rule-nav',
        label: TLS_RULE_NAME,
        testId: 'manageTlsRuleName',
        items: tlsPanelItems,
      },
      {
        order: 3,
        id: 'synthetics-alerts-manage-rules',
        label: ToggleFlyoutTranslations.navigateToAlertingButtonContent,
        iconType: 'tableOfContents',
        testId: 'xpack.synthetics.navigateToAlertingUi',
        href: manageRulesUrl.href,
        target: '_self',
        run: () => {
          void application.navigateToUrl(manageRulesUrl.href);
        },
      },
    ];

    return {
      order: 1,
      id: 'synthetics-overflow-alerts',
      label: ToggleFlyoutTranslations.alertsAndRules,
      iconType: 'bell',
      testId: 'syntheticsAlertsRulesButton',
      disableButton: () => !hasMonitors,
      popoverTestId: 'syntheticsAlertsRulesAppMenu',
      items: rootItems,
    };
  }, [
    application,
    dispatch,
    hasMonitors,
    hasUptimeWrite,
    loading,
    manageRulesUrl.href,
    noWritePermissionsTooltipContent,
    statusRuleExists,
    statusRuleNotAvailableTooltipContent,
    tlsRuleExists,
    tlsRuleNotAvailableTooltipContent,
  ]);

  const isInspectorEnabled = uiSettings?.get<boolean>(enableInspectEsQueries);
  const showInspect = Boolean(isInspectorEnabled || isDev);

  const config = useMemo((): AppMenuConfig | undefined => {
    if (!projectMenuActive) {
      return undefined;
    }

    const overflowOnlyItems: AppMenuItemType[] = [alertsOverflowItem];

    if (showInspect) {
      overflowOnlyItems.push({
        order: 2,
        id: 'synthetics-overflow-inspect',
        label: i18n.translate('xpack.synthetics.inspectButtonText', {
          defaultMessage: 'Inspect',
        }),
        iconType: 'inspect',
        testId: 'syntheticsInspectAppMenu',
        run: () => {
          inspector.open(inspectorAdapters);
        },
      });
    }

    const settingsSearch = stringifyUrlParams(params, true);

    overflowOnlyItems.push({
      order: 3,
      id: 'synthetics-overflow-settings',
      label: SETTINGS_LABEL,
      iconType: 'gear',
      testId: 'settings-page-link',
      separator: 'above',
      href: history.createHref({
        pathname: SETTINGS_ROUTE,
        search: settingsSearch,
      }),
      target: '_self',
      run: () => {
        history.push({
          pathname: SETTINGS_ROUTE,
          search: settingsSearch,
        });
      },
    });

    const secondaryActionItems: AppMenuSecondaryActionItem[] = [
      {
        id: 'synthetics-auto-refresh',
        label: formatAutoRefreshButtonLabel(refreshPaused, refreshInterval),
        iconType: 'refreshTime',
        testId: 'syntheticsAutoRefreshAppMenu',
        run: openAutoRefreshPopover,
      },
      {
        id: 'synthetics-explore-data',
        label: ANALYZE_DATA,
        iconType: 'inspect',
        testId: 'syntheticsExploreDataButton',
        tooltipContent: ANALYZE_MESSAGE,
        href: syntheticExploratoryViewLink,
        target: '_self',
        run: () => {
          void application.navigateToUrl(syntheticExploratoryViewLink);
        },
      },
    ];

    if (isCertificatesRoute) {
      return {
        layout: 'chromeBarV2',
        headerMetadata: [<LastRefreshed key="synthetics-certificates-last-refreshed" />],
        primaryActionItem: {
          id: 'synthetics-certificates-refresh',
          label: REFRESH_CERT,
          iconType: 'refresh',
          testId: 'certificatesRefreshButton',
          run: () => {
            refreshApp();
          },
        },
        secondaryActionItems,
        overflowOnlyItems,
      };
    }

    return {
      layout: 'chromeBarV2',
      headerMetadata: [<LastRefreshed key="synthetics-monitors-last-refreshed" />],
      primaryActionItem: {
        id: 'synthetics-create-location',
        label: CREATE_LOCATION_LABEL,
        iconType: 'plusInCircleFilled',
        testId: 'gettingStartedAddLocationButton',
        run: () => {
          openLocationFlyout();
        },
      },
      secondaryActionItems,
      overflowOnlyItems,
    };
  }, [
    alertsOverflowItem,
    application,
    history,
    inspector,
    inspectorAdapters,
    isCertificatesRoute,
    openLocationFlyout,
    params,
    projectMenuActive,
    openAutoRefreshPopover,
    refreshApp,
    refreshInterval,
    refreshPaused,
    setRefreshInterval,
    setRefreshPaused,
    showInspect,
    syntheticExploratoryViewLink,
  ]);

  if (!projectMenuActive || !config) {
    return null;
  }

  return (
    <>
      <AppMenu config={config} setAppMenu={chrome.setAppMenu} />
      {autoRefreshAnchorEl ? (
        <EuiWrappingPopover
          isOpen={isAutoRefreshPopoverOpen}
          button={autoRefreshAnchorEl}
          closePopover={closeAutoRefreshPopover}
          anchorPosition="downLeft"
          panelPaddingSize="m"
          panelProps={{
            'data-test-subj': 'syntheticsAutoRefreshProjectPopover',
          }}
        >
          <EuiFormRow label={AUTO_REFRESH_FORM_LABEL}>
            <EuiSelect
              compressed
              fullWidth
              data-test-subj="syntheticsAutoRefreshProjectSelect"
              options={autoRefreshSelectOptions}
              value={autoRefreshSelectValue}
              onChange={onAutoRefreshSelectChange}
            />
          </EuiFormRow>
        </EuiWrappingPopover>
      ) : null}
      {alertFlyoutVisible ? EditAlertFlyout : null}
      {alertFlyoutVisible ? NewRuleFlyout : null}
      {isPrivateLocationFlyoutVisible &&
      (isMonitorsListRoute || !locationFlyoutMountedInGettingStartedOnPrem) ? (
        <AddOrEditLocationFlyout
          onCloseFlyout={closeLocationFlyout}
          onSubmit={onCreateLocationSubmit}
          privateLocations={privateLocations}
        />
      ) : null}
    </>
  );
}
