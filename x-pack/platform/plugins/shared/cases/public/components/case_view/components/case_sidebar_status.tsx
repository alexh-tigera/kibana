/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type { CaseStatuses } from '../../../../common/types/domain';
import type { CaseUI } from '../../../../common';
import { StatusContextMenu } from '../../case_action_bar/status_context_menu';
import { useShouldDisableStatus } from '../../actions/status/use_should_disable_status';
import { SidebarTitle } from './sidebar_title';
import * as i18n from '../translations';
import type { OnUpdateFields } from '../types';

export interface CaseSidebarStatusProps {
  caseData: CaseUI;
  isStatusLoading: boolean;
  onUpdateField: (args: OnUpdateFields) => void;
}

export const CaseSidebarStatus = React.memo<CaseSidebarStatusProps>(
  ({ caseData, isStatusLoading, onUpdateField }) => {
    const shouldDisableStatusFn = useShouldDisableStatus();
    const isStatusMenuDisabled = useMemo(
      () => shouldDisableStatusFn([caseData]),
      [caseData, shouldDisableStatusFn]
    );
    const onStatusChanged = useCallback(
      (status: CaseStatuses) =>
        onUpdateField({
          key: 'status',
          value: status,
        }),
      [onUpdateField]
    );

    return (
      <EuiFlexItem grow={false} data-test-subj="case-view-sidebar-status">
        <SidebarTitle title={i18n.STATUS} />
        <EuiHorizontalRule margin="xs" />
        <StatusContextMenu
          currentStatus={caseData.status}
          disabled={isStatusMenuDisabled}
          isLoading={isStatusLoading}
          onStatusChanged={onStatusChanged}
        />
      </EuiFlexItem>
    );
  }
);
CaseSidebarStatus.displayName = 'CaseSidebarStatus';
