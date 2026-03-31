/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiNotificationBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type {
  AppMenuConfig,
  AppMenuHeaderTab,
  AppMenuPrimaryActionItem,
  AppMenuSecondaryActionItem,
} from '@kbn/core-chrome-app-menu-components';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';

import { useLink, useStartServices } from '../../../hooks';
import type { Section } from '../sections';
import { ExperimentalFeaturesService } from '../services';

import { useIsReadOnly } from '../hooks/use_read_only_context';

export interface IntegrationsDefaultLayoutAppMenuProps {
  section: Section;
  notificationsBySection?: Partial<Record<Section, number>>;
}

export const IntegrationsDefaultLayoutAppMenu: React.FC<IntegrationsDefaultLayoutAppMenuProps> = ({
  section,
  notificationsBySection,
}) => {
  const { chrome, cloud, application, automaticImport, automaticImportVTwo, notifications } =
    useStartServices();
  const { getHref, getAbsolutePath } = useLink();
  const isReadOnly = useIsReadOnly();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const config = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const browseNotificationCount = notificationsBySection?.browse;
    const installedNotificationCount = notificationsBySection?.manage;

    const headerTabs: AppMenuHeaderTab[] = [
      {
        id: 'integrations-browse',
        label: (
          <FormattedMessage
            id="xpack.fleet.appNavigation.integrationsAllLinkText"
            defaultMessage="Browse"
          />
        ),
        href: getHref('integrations_all'),
        isSelected: section === 'browse',
        append:
          browseNotificationCount != null ? (
            <EuiNotificationBadge className="eui-alignCenter" size="m">
              {browseNotificationCount}
            </EuiNotificationBadge>
          ) : undefined,
        testId: 'integrationsBrowseTab',
      },
      {
        id: 'integrations-installed',
        label: (
          <FormattedMessage
            id="xpack.fleet.appNavigation.integrationsInstalledLinkText"
            defaultMessage="Installed"
          />
        ),
        href: getHref('integrations_installed'),
        isSelected: section === 'manage',
        append:
          installedNotificationCount != null ? (
            <EuiNotificationBadge className="eui-alignCenter" size="m">
              {installedNotificationCount}
            </EuiNotificationBadge>
          ) : undefined,
        testId: 'integrationsInstalledTab',
      },
    ];

    const menuConfig: AppMenuConfig = {
      layout: 'chromeBarV2',
      headerTabs,
    };

    const showConnectionDetails = Boolean(cloud?.isCloudEnabled && cloud?.cloudId);
    if (showConnectionDetails) {
      const secondaryActionItem: AppMenuSecondaryActionItem = {
        id: 'integrations-connection-details',
        label: i18n.translate('xpack.fleet.integrations.connectionDetailsButton', {
          defaultMessage: 'Connection details',
        }),
        iconType: 'plugs',
        testId: 'integrationsConnectionDetailsAppMenu',
        run: () => {
          void openWiredConnectionDetails().catch((error: { body?: { message?: string } }) => {
            const message = error?.body?.message;
            if (message) {
              notifications.toasts.addDanger(message);
            }
          });
        },
      };
      menuConfig.secondaryActionItem = secondaryActionItem;
    }

    const { CreateIntegrationCardButton } = automaticImport?.components ?? {};
    const hideHeaderCreateCard =
      ExperimentalFeaturesService.get().newBrowseIntegrationUx && Boolean(automaticImportVTwo);
    const showCreateIntegrationPrimary =
      !hideHeaderCreateCard && Boolean(CreateIntegrationCardButton) && !isReadOnly;

    if (showCreateIntegrationPrimary) {
      const createHref = getHref('integration_create');
      const uploadHref = getAbsolutePath('/app/integrations/upload');

      const primaryActionItem: AppMenuPrimaryActionItem = {
        id: 'integrations-create-integration',
        label: i18n.translate('xpack.fleet.integrationsAppMenu.createIntegration', {
          defaultMessage: 'Create integration',
        }),
        iconType: 'plusInCircle',
        testId: 'createIntegrationAppMenuPrimary',
        run: () => {
          application.navigateToUrl(createHref);
        },
        splitButtonProps: {
          secondaryButtonIcon: 'arrowDown',
          secondaryButtonAriaLabel: i18n.translate(
            'xpack.fleet.epmList.createNewIntegrationDropdownAriaLabel',
            { defaultMessage: 'More integration creation options' }
          ),
          items: [
            {
              id: 'integrations-upload-package',
              order: 1,
              label: i18n.translate('xpack.fleet.epmList.uploadIntegrationPackageButton', {
                defaultMessage: 'Upload integration package',
              }),
              iconType: 'exportAction',
              testId: 'uploadIntegrationPackageBtn',
              run: () => {
                application.navigateToUrl(uploadHref);
              },
            },
          ],
        },
      };

      menuConfig.primaryActionItem = primaryActionItem;
    }

    return menuConfig;
  }, [
    application,
    automaticImport?.components,
    automaticImportVTwo,
    cloud?.cloudId,
    cloud?.isCloudEnabled,
    getAbsolutePath,
    getHref,
    isProjectChrome,
    isReadOnly,
    notifications.toasts,
    notificationsBySection?.browse,
    notificationsBySection?.manage,
    section,
  ]);

  if (!isProjectChrome || !config) {
    return null;
  }

  return <AppMenu config={config} setAppMenu={chrome.setAppMenu} />;
};
