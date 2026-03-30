/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, useEuiTheme } from '@elastic/eui';
import React, { useCallback } from 'react';
import type { CaseUI } from '../../../../common';
import { ActionBarStatusItem } from '../../case_action_bar/action_bar_status_item';
import { SyncAlertsSwitch } from '../../case_settings/sync_alerts_switch';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../common/use_cases_features';
import type { OnUpdateFields } from '../types';
import * as i18n from '../translations';

export interface CaseViewProjectSyncAlertsProps {
  caseData: CaseUI;
  isLoading: boolean;
  onUpdateField: (args: OnUpdateFields) => void;
}

/**
 * Sync-alerts control for project chrome when the legacy case page header is hidden.
 */
export const CaseViewProjectSyncAlerts = React.memo<CaseViewProjectSyncAlertsProps>(
  ({ caseData, isLoading, onUpdateField }) => {
    const { euiTheme } = useEuiTheme();
    const { permissions } = useCasesContext();
    const { isSyncAlertsEnabled } = useCasesFeatures();

    const onSyncAlertsChanged = useCallback(
      (syncAlerts: boolean) =>
        onUpdateField({
          key: 'settings',
          value: { ...caseData.settings, syncAlerts },
        }),
      [caseData.settings, onUpdateField]
    );

    if (!permissions.update || !isSyncAlertsEnabled) {
      return null;
    }

    return (
      <EuiFlexGroup
        gutterSize="l"
        data-test-subj="case-action-bar-wrapper"
        responsive={false}
        css={{ marginBlockEnd: euiTheme.size.m }}
      >
        <EuiFlexItem grow={false}>
          <ActionBarStatusItem
            title={
              <EuiFlexGroup component="span" alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span>{i18n.SYNC_ALERTS}</span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip content={i18n.SYNC_ALERTS_HELP} />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            data-test-subj="case-view-sync-alerts"
          >
            <SyncAlertsSwitch
              disabled={isLoading}
              isSynced={caseData.settings.syncAlerts}
              onSwitchChange={onSyncAlertsChanged}
            />
          </ActionBarStatusItem>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
CaseViewProjectSyncAlerts.displayName = 'CaseViewProjectSyncAlerts';
