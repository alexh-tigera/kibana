/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiPopover, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AlertStatus } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { TopAlert } from '../../../typings/alerts';
import { AlertDetailsRuleActionsMenuItems } from './alert_details_rule_actions_menu_items';

export interface AlertRuleNameBadgePopoverProps {
  alert: TopAlert | null;
  alertStatus: AlertStatus | undefined;
  rule: Rule | undefined;
  ruleLabel: string;
  httpBasePathPrepend: (path: string) => string;
  onSnooze: () => void;
  onEditRule: () => void;
  onUntrackAlert: () => void;
}

export function AlertRuleNameBadgePopover({
  alert,
  alertStatus,
  rule,
  ruleLabel,
  httpBasePathPrepend,
  onSnooze,
  onEditRule,
  onUntrackAlert,
}: AlertRuleNameBadgePopoverProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);

  const badgeLabel =
    ruleLabel ||
    i18n.translate('xpack.observability.alertDetails.ruleBadgeFallback', {
      defaultMessage: 'Rule',
    });

  const titleClampCss = css`
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
    max-width: min(280px, 40vw);
  `;

  return (
    <EuiPopover
      anchorPosition="downLeft"
      hasArrow={false}
      panelPaddingSize="s"
      isOpen={isPopoverOpen}
      panelStyle={{ maxWidth: '200px' }}
      closePopover={closePopover}
      aria-label={i18n.translate('xpack.observability.alertDetails.ruleBadgeAriaLabel', {
        defaultMessage: 'Rule actions',
      })}
      button={
        <EuiToolTip content={badgeLabel}>
          <EuiBadge
            color="hollow"
            iconType="arrowDown"
            iconSide="right"
            data-test-subj="alertDetailsRuleNameBadge"
            onClick={togglePopover}
            onClickAriaLabel={i18n.translate(
              'xpack.observability.alertDetails.ruleBadgeAriaLabel',
              {
                defaultMessage: 'Rule actions',
              }
            )}
          >
            <span css={titleClampCss}>{badgeLabel}</span>
          </EuiBadge>
        </EuiToolTip>
      }
    >
      <AlertDetailsRuleActionsMenuItems
        alert={alert}
        alertStatus={alertStatus}
        rule={rule}
        httpBasePathPrepend={httpBasePathPrepend}
        onClosePopover={closePopover}
        onSnooze={() => {
          closePopover();
          onSnooze();
        }}
        onEditRule={() => {
          closePopover();
          onEditRule();
        }}
        onUntrackAlert={() => {
          closePopover();
          onUntrackAlert();
        }}
      />
    </EuiPopover>
  );
}
