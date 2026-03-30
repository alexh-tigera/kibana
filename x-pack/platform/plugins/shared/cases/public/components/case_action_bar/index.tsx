/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import type { CaseUI } from '../../../common/ui/types';
import { CaseMetricsFeature } from '../../../common/types/api';
import { ActionBarStatusItem } from './action_bar_status_item';
import * as i18n from '../case_view/translations';
import { Actions } from './actions';
import { SyncAlertsSwitch } from '../case_settings/sync_alerts_switch';
import type { OnUpdateFields } from '../case_view/types';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { getStatusDate, getStatusTitle } from './helpers';
import { useRefreshCaseViewPage } from '../case_view/use_on_refresh_case_view_page';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesFeatures } from '../../common/use_cases_features';
import { useGetCaseConnectors } from '../../containers/use_get_case_connectors';

export type CaseActionBarVariant = 'full' | 'projectChromeSupplements';

export interface CaseActionBarProps {
  caseData: CaseUI;
  isLoading: boolean;
  onUpdateField: (args: OnUpdateFields) => void;
  /**
   * `projectChromeSupplements` renders sync-alerts in-page when enabled; status lives in the
   * activity sidebar. Refresh and overflow actions live in project `AppMenu`.
   */
  variant?: CaseActionBarVariant;
}

const CaseActionBarComponent: React.FC<CaseActionBarProps> = ({
  caseData,
  isLoading,
  onUpdateField,
  variant = 'full',
}) => {
  const { permissions } = useCasesContext();
  const { isSyncAlertsEnabled, metricsFeatures } = useCasesFeatures();
  const { euiTheme } = useEuiTheme();

  const { data: caseConnectors } = useGetCaseConnectors(caseData.id);

  const date = getStatusDate(caseData);
  const title = getStatusTitle(caseData.status);

  const refreshCaseViewPage = useRefreshCaseViewPage();

  const currentExternalIncident =
    caseConnectors?.[caseData.connector.id]?.push.details?.externalService ?? null;

  const onSyncAlertsChanged = useCallback(
    (syncAlerts: boolean) =>
      onUpdateField({
        key: 'settings',
        value: { ...caseData.settings, syncAlerts },
      }),
    [caseData.settings, onUpdateField]
  );

  if (variant === 'projectChromeSupplements') {
    if (!permissions.update || !isSyncAlertsEnabled) {
      return null;
    }

    return (
      <EuiFlexGroup
        gutterSize="l"
        justifyContent="flexEnd"
        data-test-subj="case-action-bar-wrapper"
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

  return (
    <EuiFlexGroup gutterSize="l" justifyContent="flexEnd" data-test-subj="case-action-bar-wrapper">
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
        css={css`
          padding-left: ${euiTheme.size.l};
          border-left: ${euiTheme.border.thin};
          @media only screen and (max-width: ${euiTheme.breakpoint.m}) {
            padding-left: 0;
            border-left: 0;
          }
        `}
      >
        {!metricsFeatures.includes(CaseMetricsFeature.LIFESPAN) ? (
          <EuiFlexItem grow={false}>
            <ActionBarStatusItem title={title} dataTestSubj="case-action-bar-status-date">
              <FormattedRelativePreferenceDate value={date} />
            </ActionBarStatusItem>
          </EuiFlexItem>
        ) : null}

        {permissions.update && isSyncAlertsEnabled ? (
          <EuiFlexItem grow={false}>
            <ActionBarStatusItem
              title={
                <EuiFlexGroup
                  component="span"
                  alignItems="center"
                  gutterSize="xs"
                  responsive={false}
                >
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
        ) : null}

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="case-refresh"
            flush="left"
            iconType="refresh"
            onClick={refreshCaseViewPage}
          >
            {i18n.CASE_REFRESH}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <Actions caseData={caseData} currentExternalIncident={currentExternalIncident} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

CaseActionBarComponent.displayName = 'CaseActionBar';

export const CaseActionBar = React.memo(CaseActionBarComponent);
