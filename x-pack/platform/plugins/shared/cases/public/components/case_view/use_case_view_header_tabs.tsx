/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import type { AppMenuHeaderTab } from '@kbn/core-chrome-app-menu-components';
import React, { useMemo } from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import type { CaseUI } from '../../../common';
import {
  useAttachmentsSubTabClickedEBT,
  useAttachmentsTabClickedEBT,
} from '../../analytics/use_attachments_tab_ebt';
import { useCaseViewNavigation } from '../../common/navigation';
import { useCasesFeatures } from '../../common/use_cases_features';
import { useGetSimilarCases } from '../../containers/use_get_similar_cases';
import { ACTIVITY_TAB, ATTACHMENTS_TAB, SIMILAR_CASES_TAB } from './translations';
import {
  AttachmentsBadge,
  SimilarCasesBadge,
  useCaseAttachmentTabs,
} from './use_case_attachment_tabs';

export interface UseCaseViewHeaderTabsParams {
  caseData: CaseUI;
  activeTabId: CASE_VIEW_PAGE_TABS;
  searchTerm?: string;
}

/**
 * Project chrome `AppMenuConfig.headerTabs` — mirrors {@link CaseViewTabs} navigation and badges.
 */
export function useCaseViewHeaderTabs({
  caseData,
  activeTabId,
  searchTerm,
}: UseCaseViewHeaderTabsParams): AppMenuHeaderTab[] {
  const { navigateToCaseView } = useCaseViewNavigation();
  const { euiTheme } = useEuiTheme();
  const { observablesAuthorized: canShowObservableTabs, isObservablesFeatureEnabled } =
    useCasesFeatures();

  const { tabs: attachmentTabs, totalAttachments } = useCaseAttachmentTabs({
    caseData,
    activeTab: activeTabId,
    searchTerm,
  });

  const { data: similarCasesData } = useGetSimilarCases({
    caseId: caseData.id,
    perPage: 0,
    page: 0,
    enabled: canShowObservableTabs && isObservablesFeatureEnabled,
  });

  const isAttachmentsTabActive = useMemo(
    () => !!attachmentTabs.find((attachmentTab) => attachmentTab.id === activeTabId),
    [activeTabId, attachmentTabs]
  );

  const defaultAttachmentsTabId = attachmentTabs[0]?.id ?? CASE_VIEW_PAGE_TABS.ALERTS;

  const trackAttachmentsTabClick = useAttachmentsTabClickedEBT();
  const trackAttachmentsSubTabClick = useAttachmentsSubTabClickedEBT();

  return useMemo(
    (): AppMenuHeaderTab[] => [
      {
        id: CASE_VIEW_PAGE_TABS.ACTIVITY,
        label: ACTIVITY_TAB,
        isSelected: activeTabId === CASE_VIEW_PAGE_TABS.ACTIVITY,
        onClick: () => {
          navigateToCaseView({ detailName: caseData.id, tabId: CASE_VIEW_PAGE_TABS.ACTIVITY });
        },
        testId: `case-view-tab-title-${CASE_VIEW_PAGE_TABS.ACTIVITY}`,
      },
      {
        id: CASE_VIEW_PAGE_TABS.ATTACHMENTS,
        label: ATTACHMENTS_TAB,
        append: (
          <AttachmentsBadge
            isActive={isAttachmentsTabActive}
            euiTheme={euiTheme}
            count={totalAttachments}
          />
        ),
        isSelected: isAttachmentsTabActive,
        onClick: () => {
          trackAttachmentsTabClick();
          trackAttachmentsSubTabClick(defaultAttachmentsTabId);
          navigateToCaseView({
            detailName: caseData.id,
            tabId: CASE_VIEW_PAGE_TABS.ALERTS,
          });
        },
        testId: `case-view-tab-title-${CASE_VIEW_PAGE_TABS.ATTACHMENTS}`,
      },
      {
        id: CASE_VIEW_PAGE_TABS.SIMILAR_CASES,
        label: SIMILAR_CASES_TAB,
        append: (
          <SimilarCasesBadge
            activeTab={activeTabId}
            euiTheme={euiTheme}
            count={similarCasesData?.total}
          />
        ),
        isSelected: activeTabId === CASE_VIEW_PAGE_TABS.SIMILAR_CASES,
        onClick: () => {
          navigateToCaseView({
            detailName: caseData.id,
            tabId: CASE_VIEW_PAGE_TABS.SIMILAR_CASES,
          });
        },
        testId: `case-view-tab-title-${CASE_VIEW_PAGE_TABS.SIMILAR_CASES}`,
      },
    ],
    [
      activeTabId,
      caseData.id,
      defaultAttachmentsTabId,
      euiTheme,
      isAttachmentsTabActive,
      navigateToCaseView,
      similarCasesData?.total,
      totalAttachments,
      trackAttachmentsTabClick,
      trackAttachmentsSubTabClick,
    ]
  );
}
