/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type {
  AppMenuConfig,
  AppMenuHeaderTab,
  AppMenuItemType,
} from '@kbn/core-chrome-app-menu-components';
import type { Section } from './constants';
import { useKibana } from '../common/lib/kibana';

export interface ManagementRulesHomeAppMenuProps {
  activeSection: Section;
  authorizedToCreateAnyRules: boolean;
  authorizedToReadAnyRules: boolean;
  showRulesSettingsInMenu: boolean;
  onSectionChange: (section: Section) => void;
  openRuleTypeModal: () => void;
  openSettingsFlyout: () => void;
}

/**
 * Project chrome: registers Stack Management Rules header actions (Create rule, Settings,
 * Documentation) in the shared AppMenuBar. Classic chrome keeps actions on EuiPageTemplate.Header.
 */
export const ManagementRulesHomeAppMenu: React.FC<ManagementRulesHomeAppMenuProps> = ({
  activeSection,
  authorizedToCreateAnyRules,
  authorizedToReadAnyRules,
  showRulesSettingsInMenu,
  onSectionChange,
  openRuleTypeModal,
  openSettingsFlyout,
}) => {
  const { chrome, docLinks } = useKibana().services;
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const config = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const overflowOnlyItems: AppMenuItemType[] = [];

    if (showRulesSettingsInMenu) {
      overflowOnlyItems.push({
        order: 10,
        id: 'management-rules-settings',
        label: i18n.translate('xpack.triggersActionsUI.rulesSettings.link.title', {
          defaultMessage: 'Settings',
        }),
        iconType: 'gear',
        run: () => {
          openSettingsFlyout();
        },
        testId: 'rulesSettingsLink',
      });
    }

    overflowOnlyItems.push({
      order: 20,
      id: 'management-rules-documentation',
      label: i18n.translate('xpack.triggersActionsUI.home.docsLinkText', {
        defaultMessage: 'Documentation',
      }),
      iconType: 'question',
      href: docLinks.links.alerting.guide,
      target: '_blank',
      testId: 'documentationLink',
    });

    const headerTabs: AppMenuHeaderTab[] = [
      {
        id: 'rules',
        label: (
          <FormattedMessage
            id="xpack.triggersActionsUI.home.rulesTabTitle"
            defaultMessage="Rules"
          />
        ),
        isSelected: activeSection === 'rules',
        onClick: () => {
          onSectionChange('rules');
        },
        testId: 'rulesTab',
      },
    ];

    if (authorizedToReadAnyRules) {
      headerTabs.push({
        id: 'logs',
        label: (
          <FormattedMessage
            id="xpack.triggersActionsUI.home.logsTabTitle"
            defaultMessage="Logs"
          />
        ),
        isSelected: activeSection === 'logs',
        onClick: () => {
          onSectionChange('logs');
        },
        testId: 'logsTab',
      });
    }

    const menuConfig: AppMenuConfig = {
      layout: 'chromeBarV2',
      overflowOnlyItems,
      headerTabs,
    };

    if (authorizedToCreateAnyRules) {
      menuConfig.primaryActionItem = {
        id: 'management-rules-create-rule',
        label: i18n.translate('xpack.triggersActionsUI.sections.rulesList.addRuleButtonLabel', {
          defaultMessage: 'Create rule',
        }),
        iconType: 'plusInCircle',
        run: () => {
          openRuleTypeModal();
        },
        testId: 'createRuleButton',
      };
    }

    return menuConfig;
  }, [
    activeSection,
    authorizedToCreateAnyRules,
    authorizedToReadAnyRules,
    docLinks.links.alerting.guide,
    isProjectChrome,
    onSectionChange,
    openRuleTypeModal,
    openSettingsFlyout,
    showRulesSettingsInMenu,
  ]);

  if (!isProjectChrome || !config) {
    return null;
  }

  return <AppMenu config={config} setAppMenu={chrome.setAppMenu} />;
};

ManagementRulesHomeAppMenu.displayName = 'ManagementRulesHomeAppMenu';
