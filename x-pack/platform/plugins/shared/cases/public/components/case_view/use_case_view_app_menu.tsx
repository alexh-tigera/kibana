/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import type { CaseUI } from '../../../common/ui/types';
import { useKibana } from '../../common/lib/kibana';
import { useCasesToast } from '../../common/use_cases_toast';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetCaseConnectors } from '../../containers/use_get_case_connectors';
import * as i18n from './translations';
import {
  COPY_ID_ACTION_LABEL,
  COPY_ID_ACTION_SUCCESS,
  DELETE_CASE,
} from '../../common/translations';
import { useRefreshCaseViewPage } from './use_on_refresh_case_view_page';

export interface UseCaseViewAppMenuParams {
  caseData: CaseUI;
  onOpenDeleteModal: () => void;
  onOpenRenameModal: () => void;
}

export function useCaseViewAppMenu({
  caseData,
  onOpenDeleteModal,
  onOpenRenameModal,
}: UseCaseViewAppMenuParams): AppMenuConfig | undefined {
  const { chrome } = useKibana().services;
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';
  const { permissions } = useCasesContext();
  const { data: caseConnectors } = useGetCaseConnectors(caseData.id);
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { showSuccessToast } = useCasesToast();

  return useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const currentExternalIncident =
      caseConnectors?.[caseData.connector.id]?.push.details?.externalService ?? null;

    const overflowOnlyItems: AppMenuItemType[] = [];

    overflowOnlyItems.push({
      order: 10,
      id: 'case-view-copy-id',
      label: COPY_ID_ACTION_LABEL,
      iconType: 'copyClipboard',
      run: () => {
        navigator.clipboard.writeText(caseData.id);
        showSuccessToast(COPY_ID_ACTION_SUCCESS);
      },
      testId: 'cases-case-view-copy-id-app-menu',
    });

    if (permissions.update) {
      overflowOnlyItems.push({
        order: 15,
        id: 'case-view-rename',
        label: i18n.RENAME_CASE_OVERFLOW,
        iconType: 'pencil',
        run: () => {
          onOpenRenameModal();
        },
        testId: 'cases-case-view-rename-app-menu',
      });
    }

    if (currentExternalIncident != null && !isEmpty(currentExternalIncident?.externalUrl)) {
      overflowOnlyItems.push({
        order: 20,
        id: 'case-view-view-incident',
        label: i18n.VIEW_INCIDENT(currentExternalIncident?.externalTitle ?? ''),
        iconType: 'popout',
        run: () => {
          window.open(currentExternalIncident?.externalUrl, '_blank');
        },
        testId: 'cases-case-view-view-incident-app-menu',
      });
    }

    if (permissions.delete) {
      overflowOnlyItems.push({
        order: 30,
        id: 'case-view-delete',
        label: DELETE_CASE(1),
        iconType: 'trash',
        separator: 'above',
        run: () => {
          onOpenDeleteModal();
        },
        testId: 'cases-case-view-delete-app-menu',
      });
    }

    return {
      layout: 'chromeBarV2',
      primaryActionItem: {
        id: 'case-view-refresh',
        label: i18n.CASE_REFRESH,
        iconType: 'refresh',
        run: () => {
          refreshCaseViewPage();
        },
        testId: 'case-refresh',
      },
      overflowOnlyItems,
    };
  }, [
    isProjectChrome,
    caseData,
    caseConnectors,
    onOpenDeleteModal,
    onOpenRenameModal,
    permissions.delete,
    permissions.update,
    refreshCaseViewPage,
    showSuccessToast,
  ]);
}
