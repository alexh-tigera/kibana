/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { ILM_POLICY_NAME } from '@kbn/reporting-common';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type {
  AppMenuConfig,
  AppMenuHeaderTab,
  AppMenuPrimaryActionItem,
  AppMenuSecondaryActionItem,
} from '@kbn/core-chrome-app-menu-components';
import type { ClientConfigType } from '@kbn/reporting-public';
import { useKibana } from '@kbn/reporting-public';
import type { Section } from '../../constants';
import { useIlmPolicyStatus } from '../../lib/ilm_policy_status_context';

export interface ReportingManagementAppMenuProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  clientConfig: ClientConfigType;
  statefulSettingsEnabled: boolean;
  onRunDiagnosis: () => void;
}

/**
 * Project chrome: registers Stack Management Reporting section tabs (Exports, Schedules) and
 * stateful actions (Edit ILM policy, Run diagnosis) in the shared AppMenuBar. Classic chrome
 * keeps controls on EuiPageTemplate.Header.
 */
export const ReportingManagementAppMenu: React.FC<ReportingManagementAppMenuProps> = ({
  activeSection,
  onSectionChange,
  clientConfig,
  statefulSettingsEnabled,
  onRunDiagnosis,
}) => {
  const {
    services: {
      chrome,
      application: { capabilities },
      share: { url: urlService },
    },
  } = useKibana();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const ilmPolicyContextValue = useIlmPolicyStatus();
  const ilmLocator = urlService.locators.get('ILM_LOCATOR_ID');
  const hasIlmPolicy = ilmPolicyContextValue?.status !== 'policy-not-found';
  const showIlmPolicyLink = Boolean(ilmLocator && hasIlmPolicy);

  const configAllowsImageReports =
    clientConfig.export_types.pdf.enabled || clientConfig.export_types.png.enabled;

  const config = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const headerTabs: AppMenuHeaderTab[] = [
      {
        id: 'exports',
        label: i18n.translate('xpack.reporting.tabs.exports', {
          defaultMessage: 'Exports',
        }),
        isSelected: activeSection === 'exports',
        onClick: () => {
          onSectionChange('exports');
        },
        testId: 'reportingTabs-exports',
      },
      {
        id: 'schedules',
        label: i18n.translate('xpack.reporting.tabs.schedules', {
          defaultMessage: 'Schedules',
        }),
        isSelected: activeSection === 'schedules',
        onClick: () => {
          onSectionChange('schedules');
        },
        testId: 'reportingTabs-schedules',
      },
    ];

    const menuConfig: AppMenuConfig = {
      layout: 'chromeBarV2',
      headerTabs,
    };

    if (statefulSettingsEnabled) {
      const secondaryActionItems: AppMenuSecondaryActionItem[] = [];

      if (
        capabilities?.management?.data?.index_lifecycle_management &&
        !ilmPolicyContextValue?.isLoading &&
        showIlmPolicyLink &&
        ilmLocator
      ) {
        secondaryActionItems.push({
          id: 'reporting-ilm-policy',
          label: i18n.translate('xpack.reporting.listing.reports.ilmPolicyLinkText', {
            defaultMessage: 'Edit ILM policy',
          }),
          iconType: 'popout',
          run: () => {
            const url = ilmLocator.getRedirectUrl({
              page: 'policy_edit',
              policyName: ILM_POLICY_NAME,
            });
            window.open(url, '_blank');
            window.focus();
          },
          testId: 'ilmPolicyLink',
        });
      }

      if (secondaryActionItems.length > 0) {
        menuConfig.secondaryActionItems = secondaryActionItems;
      }

      if (configAllowsImageReports) {
        const primaryActionItem: AppMenuPrimaryActionItem = {
          id: 'reporting-run-diagnosis',
          label: i18n.translate('xpack.reporting.listing.diagnosticButton', {
            defaultMessage: 'Run diagnosis',
          }),
          iconType: 'inspect',
          run: () => {
            onRunDiagnosis();
          },
          testId: 'screenshotDiagnosticLink',
        };
        menuConfig.primaryActionItem = primaryActionItem;
      }
    }

    return menuConfig;
  }, [
    activeSection,
    capabilities?.management?.data?.index_lifecycle_management,
    configAllowsImageReports,
    ilmLocator,
    ilmPolicyContextValue,
    isProjectChrome,
    onRunDiagnosis,
    onSectionChange,
    statefulSettingsEnabled,
  ]);

  if (!isProjectChrome || !config) {
    return null;
  }

  return <AppMenu config={config} setAppMenu={chrome.setAppMenu} />;
};

ReportingManagementAppMenu.displayName = 'ReportingManagementAppMenu';
