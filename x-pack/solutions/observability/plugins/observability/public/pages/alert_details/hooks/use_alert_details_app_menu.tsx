/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { noop } from 'lodash';
import { i18n } from '@kbn/i18n';
import type {
  AppMenuConfig,
  AppMenuHeaderTab,
  AppMenuItemType,
} from '@kbn/core-chrome-app-menu-components';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared/src/alert_lifecycle_status_badge';
import type { AlertStatus } from '@kbn/rule-data-utils';
import { ALERT_FLAPPING, ALERT_UUID } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { useLocatorUrl } from '@kbn/share-plugin/public';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public/types';
import { useKibana } from '../../../utils/kibana_react';
import type { TopAlert } from '../../../typings/alerts';
import { useBulkUntrackAlerts } from './use_bulk_untrack_alerts';
import { useDiscoverUrl } from './use_discover_url/use_discover_url';
import {
  AlertDetailsRuleFormFlyout,
  type AlertDetailsRuleFormFlyoutBaseProps,
} from '../components/alert_details_rule_form_flyout';
import { AlertRuleNameBadgePopover } from '../components/alert_rule_name_badge_popover';
import { useAlertDetailsHeaderMetadataItems } from '../components/build_alert_details_header_metadata';

export interface UseAlertDetailsAppMenuParams {
  isProjectChrome: boolean;
  alert: TopAlert | null;
  alertIndex?: string;
  alertStatus: AlertStatus | undefined;
  rule: Rule | undefined;
  refetch: AlertDetailsRuleFormFlyoutBaseProps['refetch'];
  onUntrackAlert: () => void;
  onUpdate: AlertDetailsRuleFormFlyoutBaseProps['onUpdate'];
  /** Rule name shown on the rule badge (e.g. rule.name or alert rule name field). */
  ruleBadgeLabel: string;
  headerTabs: AppMenuHeaderTab[];
  /**
   * When the Cases plugin is enabled, pass the modal API from
   * `cases.hooks.useCasesAddToExistingCaseModal` (must be called in a component that mounts only when `cases` exists).
   */
  addToCaseModalApi?: {
    open: (options: { getAttachments: () => CaseAttachmentsWithoutOwner }) => void;
  };
}

export interface UseAlertDetailsAppMenuReturn {
  appMenuConfig: AppMenuConfig;
  modals: React.ReactNode;
}

export function useAlertDetailsAppMenu({
  isProjectChrome,
  alert,
  alertIndex,
  alertStatus,
  rule,
  refetch,
  onUntrackAlert,
  onUpdate,
  ruleBadgeLabel,
  headerTabs,
  addToCaseModalApi,
}: UseAlertDetailsAppMenuParams): UseAlertDetailsAppMenuReturn {
  const { services } = useKibana();
  const {
    triggersActionsUi: { getRuleSnoozeModal: RuleSnoozeModal },
    http,
    share,
    application: { navigateToUrl },
  } = services;

  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const addDataHref = useLocatorUrl(onboardingLocator, {});

  const { discoverUrl } = useDiscoverUrl({ alert, rule });
  const { mutateAsync: untrackAlerts } = useBulkUntrackAlerts();

  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [alertDetailsRuleFormFlyoutOpen, setAlertDetailsRuleFormFlyoutOpen] = useState(false);

  const attachments: CaseAttachmentsWithoutOwner =
    alert && rule
      ? [
          {
            alertId: alert?.fields[ALERT_UUID] || '',
            index: alertIndex || '',
            rule: {
              id: rule.id,
              name: rule.name,
            },
            type: AttachmentType.alert,
          },
        ]
      : [];

  const handleAddToCase = useCallback(() => {
    addToCaseModalApi?.open({ getAttachments: () => attachments });
  }, [addToCaseModalApi, attachments]);

  const handleUntrackAlert = useCallback(async () => {
    if (alert) {
      await untrackAlerts({
        indices: ['.internal.alerts-observability.*'],
        alertUuids: [alert.fields[ALERT_UUID]],
      });
      onUntrackAlert();
    }
  }, [alert, untrackAlerts, onUntrackAlert]);

  const handleOpenSnoozeModal = useCallback(() => {
    setSnoozeModalOpen(true);
  }, []);

  const handleEditRule = useCallback(() => {
    setAlertDetailsRuleFormFlyoutOpen(true);
  }, []);

  const headerMetadata = useAlertDetailsHeaderMetadataItems(alert);

  const headerBadges = useMemo(() => {
    if (!alert) {
      return undefined;
    }
    return [
      alertStatus ? (
        <AlertLifecycleStatusBadge
          key="alert-details-status"
          alertStatus={alertStatus}
          flapping={alert.fields[ALERT_FLAPPING]}
        />
      ) : null,
      <AlertRuleNameBadgePopover
        key="alert-details-rule-badge"
        alert={alert}
        alertStatus={alertStatus}
        rule={rule}
        ruleLabel={ruleBadgeLabel}
        httpBasePathPrepend={http.basePath.prepend}
        onSnooze={handleOpenSnoozeModal}
        onEditRule={handleEditRule}
        onUntrackAlert={handleUntrackAlert}
      />,
    ].filter(Boolean) as React.ReactNode[];
  }, [
    alert,
    alertStatus,
    rule,
    ruleBadgeLabel,
    http.basePath,
    handleOpenSnoozeModal,
    handleEditRule,
    handleUntrackAlert,
  ]);

  const appMenuConfig = useMemo((): AppMenuConfig => {
    if (!isProjectChrome || !alert) {
      return {};
    }

    const overflowOnlyItems: AppMenuItemType[] = [];
    if (addDataHref) {
      overflowOnlyItems.push({
        order: 1,
        id: 'observability-alert-details-add-data',
        label: i18n.translate('xpack.observability.home.addData', {
          defaultMessage: 'Add data',
        }),
        iconType: 'indexOpen',
        testId: 'alertDetailsHeaderAddData',
        run: () => {
          void navigateToUrl(addDataHref);
        },
      });
    }

    const menu: AppMenuConfig = {
      layout: 'chromeBarV2',
      headerTabs,
      ...(headerMetadata ? { headerMetadata } : {}),
      ...(headerBadges?.length ? { headerBadges } : {}),
    };

    if (discoverUrl) {
      menu.secondaryActionItem = {
        id: 'observability-alert-details-discover',
        label: i18n.translate('xpack.observability.alertDetails.viewInDiscover', {
          defaultMessage: 'View in Discover',
        }),
        iconType: 'discoverApp',
        testId: `alertDetailsPage_viewInDiscover${rule ? `_${rule.ruleTypeId}` : ''}`,
        href: discoverUrl,
        target: '_blank',
      };
    }

    if (addToCaseModalApi) {
      menu.primaryActionItem = {
        id: 'observability-alert-details-add-to-case',
        label: i18n.translate('xpack.observability.alertDetails.addToCase', {
          defaultMessage: 'Add to case',
        }),
        iconType: 'plus',
        testId: `add-to-cases-button-${rule?.ruleTypeId ?? 'unknown'}`,
        run: handleAddToCase,
      };
    }

    if (overflowOnlyItems.length > 0) {
      menu.overflowOnlyItems = overflowOnlyItems;
    }

    return menu;
  }, [
    isProjectChrome,
    alert,
    headerTabs,
    headerMetadata,
    headerBadges,
    discoverUrl,
    rule,
    addToCaseModalApi,
    addDataHref,
    navigateToUrl,
    handleAddToCase,
  ]);

  const modals = useMemo(
    () => (
      <>
        {rule ? (
          <AlertDetailsRuleFormFlyout
            isRuleFormFlyoutOpen={alertDetailsRuleFormFlyoutOpen}
            setIsRuleFormFlyoutOpen={setAlertDetailsRuleFormFlyoutOpen}
            onUpdate={onUpdate}
            refetch={refetch}
            rule={rule}
          />
        ) : null}

        {rule && snoozeModalOpen ? (
          <RuleSnoozeModal
            rule={rule}
            onClose={() => setSnoozeModalOpen(false)}
            onRuleChanged={async () => {
              refetch();
            }}
            onLoading={noop}
          />
        ) : null}
      </>
    ),
    [rule, alertDetailsRuleFormFlyoutOpen, onUpdate, refetch, snoozeModalOpen]
  );

  return { appMenuConfig, modals };
}
