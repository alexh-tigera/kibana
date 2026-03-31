/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type {
  AppMenuConfig,
  AppMenuHeaderTab,
  AppMenuItemType,
} from '@kbn/core-chrome-app-menu-components';

import { Section } from '../../../../common/constants';
import { documentationService } from '../../services/documentation';
import { useAppContext } from '../../app_context';

export interface IndexManagementHomeAppMenuProps {
  section: Section;
  tabs: Array<{ id: Section; name: React.ReactNode }>;
  onSectionChange: (section: Section) => void;
}

/**
 * Project chrome: registers Index Management header tabs and Documentation in the shared AppMenuBar.
 * Classic chrome keeps tabs and docs on EuiPageHeader.
 */
export const IndexManagementHomeAppMenu: React.FC<IndexManagementHomeAppMenuProps> = ({
  section,
  tabs,
  onSectionChange,
}) => {
  const {
    core: { chrome },
  } = useAppContext();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const config = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const overflowOnlyItems: AppMenuItemType[] = [
      {
        order: 10,
        id: 'index-management-documentation',
        label: i18n.translate('xpack.idxMgmt.home.documentationOverflowLabel', {
          defaultMessage: 'Documentation',
        }),
        iconType: 'question',
        href: documentationService.getIdxMgmtDocumentationLink(),
        target: '_blank',
        testId: 'documentationLink',
      },
    ];

    const headerTabs: AppMenuHeaderTab[] = tabs.map((tab) => ({
      id: tab.id,
      label: tab.name,
      isSelected: tab.id === section,
      onClick: () => {
        onSectionChange(tab.id);
      },
      testId: `${tab.id}Tab`,
    }));

    return {
      layout: 'chromeBarV2',
      overflowOnlyItems,
      headerTabs,
      ...(section === Section.Indices ? { hideProjectHeaderBackButton: true } : {}),
    };
  }, [isProjectChrome, onSectionChange, section, tabs]);

  if (!isProjectChrome || !config) {
    return null;
  }

  return <AppMenu config={config} setAppMenu={chrome.setAppMenu} />;
};

IndexManagementHomeAppMenu.displayName = 'IndexManagementHomeAppMenu';
