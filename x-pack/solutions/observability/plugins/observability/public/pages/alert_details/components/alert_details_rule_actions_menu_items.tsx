/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenu, type EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { AlertStatus } from '@kbn/rule-data-utils';
import { ALERT_RULE_UUID, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { TopAlert } from '../../../typings/alerts';
import { paths } from '../../../../common/locators/paths';

export interface AlertDetailsRuleActionsMenuItemsProps {
  alert: TopAlert | null;
  alertStatus: AlertStatus | undefined;
  rule: Rule | undefined;
  httpBasePathPrepend: (path: string) => string;
  onSnooze: () => void;
  onEditRule: () => void;
  onUntrackAlert: () => void;
  /** Called when activating the external "View rule" link so the anchor popover can close. */
  onClosePopover?: () => void;
}

export function AlertDetailsRuleActionsMenuItems({
  alert,
  alertStatus,
  rule,
  httpBasePathPrepend,
  onSnooze,
  onEditRule,
  onUntrackAlert,
  onClosePopover,
}: AlertDetailsRuleActionsMenuItemsProps) {
  const ruleDetailsHref =
    rule && alert?.fields[ALERT_RULE_UUID]
      ? httpBasePathPrepend(paths.observability.ruleDetails(rule.id))
      : '';

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: i18n.translate('xpack.observability.alertDetails.snoozeRule', {
              defaultMessage: 'Snooze rule',
            }),
            icon: 'bellSlash',
            onClick: onSnooze,
            disabled: !alert?.fields[ALERT_RULE_UUID] || !rule,
            'data-test-subj': 'snooze-rule-button',
          },
          {
            name: i18n.translate('xpack.observability.alertDetails.editRule', {
              defaultMessage: 'Edit rule',
            }),
            icon: 'pencil',
            onClick: onEditRule,
            disabled: !alert?.fields[ALERT_RULE_UUID] || !rule,
            'data-test-subj': 'edit-rule-button',
          },
          {
            name: i18n.translate('xpack.observability.alertDetails.untrackAlert', {
              defaultMessage: 'Mark as untracked',
            }),
            icon: 'eyeClosed',
            onClick: onUntrackAlert,
            disabled: alertStatus !== ALERT_STATUS_ACTIVE,
            'data-test-subj': 'untrack-alert-button',
          },
          {
            name: i18n.translate('xpack.observability.alertDetails.viewRule', {
              defaultMessage: 'View rule',
            }),
            icon: 'link',
            href: ruleDetailsHref || undefined,
            target: '_blank',
            disabled: !alert?.fields[ALERT_RULE_UUID] || !rule,
            'data-test-subj': 'view-rule-details-button',
            onClick: onClosePopover,
          },
        ],
      },
    ],
    [
      alert,
      alertStatus,
      onClosePopover,
      onEditRule,
      onSnooze,
      onUntrackAlert,
      rule,
      ruleDetailsHref,
    ]
  );

  return <EuiContextMenu initialPanelId={0} panels={panels} size="s" />;
}
