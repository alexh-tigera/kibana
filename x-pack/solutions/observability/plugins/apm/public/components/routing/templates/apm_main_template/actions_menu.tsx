/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ApmRuleType } from '@kbn/rule-data-utils';
import React, { useMemo } from 'react';
import { useApmHeaderFlyouts } from '../../../../context/apm_header_flyouts/apm_header_flyouts_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useManageSlosUrl } from '../../../../hooks/use_manage_slos_url';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import type { ActionGroups } from '../../../shared/actions_context_menu';
import { ActionsContextMenu } from '../../../shared/actions_context_menu';

const actionsLabel = i18n.translate('xpack.apm.home.actionsMenu.actions', {
  defaultMessage: 'Actions',
});

export function ActionsMenu() {
  const { core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;
  const { openAlertRuleType, openSloIndicatorType } = useApmHeaderFlyouts();

  const canReadMlJobs = !!capabilities.ml?.canGetJobs;
  const { isAlertingAvailable, canSaveAlerts } = getAlertingCapabilities(plugins, capabilities);
  const canSaveApmAlerts = !!capabilities.apm.save && canSaveAlerts;
  const canReadSlos = !!capabilities.slo?.read;
  const canWriteSlos = !!capabilities.slo?.write;

  const manageSlosUrl = useManageSlosUrl();

  const actionGroups: ActionGroups = useMemo(() => {
    const groups: ActionGroups = [];

    if (isAlertingAvailable && canSaveApmAlerts) {
      groups.push({
        id: 'alerts',
        groupLabel: i18n.translate('xpack.apm.home.actionsMenu.alertsGroup', {
          defaultMessage: 'Alerts',
        }),
        actions: [
          {
            id: 'createThresholdRule',
            name: i18n.translate('xpack.apm.home.actionsMenu.createThresholdRule', {
              defaultMessage: 'Create threshold rule',
            }),
            items: [
              {
                id: 'createLatencyRule',
                name: i18n.translate('xpack.apm.home.actionsMenu.latency', {
                  defaultMessage: 'Latency',
                }),
                onClick: () => openAlertRuleType(ApmRuleType.TransactionDuration),
              },
              {
                id: 'createFailedTransactionRateRule',
                name: i18n.translate('xpack.apm.home.actionsMenu.failedTransactionRate', {
                  defaultMessage: 'Failed transaction rate',
                }),
                onClick: () => openAlertRuleType(ApmRuleType.TransactionErrorRate),
              },
            ],
          },
          ...(canReadMlJobs
            ? [
                {
                  id: 'createAnomalyRule',
                  name: i18n.translate('xpack.apm.home.actionsMenu.createAnomalyRule', {
                    defaultMessage: 'Create anomaly rule',
                  }),
                  onClick: () => openAlertRuleType(ApmRuleType.Anomaly),
                },
              ]
            : []),
          {
            id: 'createErrorCountRule',
            name: i18n.translate('xpack.apm.home.actionsMenu.createErrorCountRule', {
              defaultMessage: 'Create error count rule',
            }),
            onClick: () => openAlertRuleType(ApmRuleType.ErrorCount),
          },
        ],
      });
    }

    if (canWriteSlos || canReadSlos) {
      groups.push({
        id: 'slos',
        groupLabel: i18n.translate('xpack.apm.home.actionsMenu.slosGroup', {
          defaultMessage: 'SLOs',
        }),
        actions: [
          ...(canWriteSlos
            ? [
                {
                  id: 'createLatencySlo',
                  name: i18n.translate('xpack.apm.home.actionsMenu.createLatencySlo', {
                    defaultMessage: 'Create APM latency SLO',
                  }),
                  onClick: () => openSloIndicatorType('sli.apm.transactionDuration'),
                },
                {
                  id: 'createAvailabilitySlo',
                  name: i18n.translate('xpack.apm.home.actionsMenu.createAvailabilitySlo', {
                    defaultMessage: 'Create APM availability SLO',
                  }),
                  onClick: () => openSloIndicatorType('sli.apm.transactionErrorRate'),
                },
              ]
            : []),
          ...(canReadSlos
            ? [
                {
                  id: 'manageSlos',
                  name: i18n.translate('xpack.apm.home.actionsMenu.manageSlos', {
                    defaultMessage: 'Manage SLOs',
                  }),
                  href: manageSlosUrl,
                  icon: 'tableOfContents',
                },
              ]
            : []),
        ],
      });
    }

    return groups;
  }, [
    isAlertingAvailable,
    canSaveApmAlerts,
    canReadMlJobs,
    canWriteSlos,
    canReadSlos,
    manageSlosUrl,
    openAlertRuleType,
    openSloIndicatorType,
  ]);

  if (actionGroups.length === 0) {
    return null;
  }

  return (
    <ActionsContextMenu
      id="actions-menu"
      actions={actionGroups}
      button={
        <EuiButton
          fill
          size="s"
          iconType="arrowDown"
          iconSide="right"
          data-test-subj="apmActionsMenuButton"
        >
          {actionsLabel}
        </EuiButton>
      }
    />
  );
}
