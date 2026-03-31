/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type {
  AppMenuConfig,
  AppMenuHeaderTab,
  AppMenuItemType,
} from '@kbn/core-chrome-app-menu-components';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';

import type { Index } from '../../../../../../common';
import type { IndexDetailsTabId } from '../../../../../../common/constants';
import { useAppContext } from '../../../../app_context';
import { renderBadges } from '../../../../lib/render_badges';
import { ModalHost } from '../index_actions_context_menu/modal_host/modal_host';
import type { ModalHostHandles } from '../index_actions_context_menu/modal_host/modal_host';
import { useManageIndexButtonHandlers } from './use_manage_index_button_handlers';
import { useIndexDetailsManageAppMenuPopoverItems } from './use_index_details_manage_app_menu_items';

export interface IndexDetailsAppMenuProps {
  index: Index;
  tab: IndexDetailsTabId;
  tabs: Array<{ id: IndexDetailsTabId; name: React.ReactNode }>;
  onSectionChange: (section: IndexDetailsTabId) => void;
  fetchIndexDetails: () => Promise<void>;
  navigateToIndicesList: () => void;
  onIndexRefresh?: () => Promise<void> | void;
  showConnectionDetails?: boolean;
}

/**
 * Project chrome: registers index name, badges, tabs, and actions in AppMenuBar.
 */
export const IndexDetailsAppMenu: React.FC<IndexDetailsAppMenuProps> = ({
  index,
  tab,
  tabs,
  onSectionChange,
  fetchIndexDetails,
  navigateToIndicesList,
  onIndexRefresh,
  showConnectionDetails = false,
}) => {
  const {
    core: { chrome, application, http, getUrlForApp },
    services: { extensionsService, notificationService },
    url,
  } = useAppContext();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const modalRef = useRef<ModalHostHandles>(null);

  const {
    indexNames,
    indices,
    indexStatusByName,
    isLoading,
    reloadIndices,
    closeIndices,
    openIndices,
    flushIndices,
    refreshIndices,
    clearCacheIndices,
    forcemergeIndices,
    deleteIndices,
    performExtensionAction,
  } = useManageIndexButtonHandlers({
    index,
    reloadIndexDetails: fetchIndexDetails,
    navigateToIndicesList,
    onIndexRefresh,
  });

  const managePopoverItems = useIndexDetailsManageAppMenuPopoverItems({
    indexNames,
    indices,
    indexStatusByName,
    modalRef,
    closeIndices,
    openIndices,
    flushIndices,
    refreshIndices,
    clearCacheIndices,
    deleteIndices,
    performExtensionAction,
    reloadIndices,
  });

  const discoverLocator = url?.locators.get('DISCOVER_APP_LOCATOR');

  const config = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const headerTabs: AppMenuHeaderTab[] = tabs.map((tabConfig) => ({
      id: tabConfig.id,
      label: tabConfig.name,
      isSelected: tabConfig.id === tab,
      onClick: () => {
        onSectionChange(tabConfig.id);
      },
      testId: `indexDetailsTab-${tabConfig.id}`,
    }));

    const overflowOnlyItems: AppMenuItemType[] = [];

    if (showConnectionDetails) {
      overflowOnlyItems.push({
        order: 20,
        id: 'index-details-connection-details',
        label: i18n.translate('xpack.idxMgmt.indexDetails.connectionDetailsButtonLabel', {
          defaultMessage: 'Connection details',
        }),
        iconType: 'plugs',
        testId: 'openConnectionDetails',
        run: () => {
          openWiredConnectionDetails({
            props: { options: { defaultTabId: 'apiKeys' } },
          }).catch((error: { body: { message: string } }) => {
            notificationService.showDangerToast(error.body.message);
          });
        },
      });
    }

    const menuConfig: AppMenuConfig = {
      layout: 'chromeBarV2',
      headerTabs,
      headerBadges: [renderBadges(index, extensionsService)],
    };

    if (discoverLocator) {
      menuConfig.primaryActionItem = {
        id: 'open-in-discover',
        label: i18n.translate('xpack.idxMgmt.goToDiscover.openInDiscoverButtonLabel', {
          defaultMessage: 'Open in Discover',
        }),
        iconType: 'discoverApp',
        testId: 'discoverButtonLink',
        run: () => {
          void discoverLocator.navigate({ dataViewSpec: { title: index.name } });
        },
      };
    }

    menuConfig.secondaryActionItem = {
      id: 'manage-index-actions',
      label: i18n.translate('xpack.idxMgmt.indexActionsMenu.manageButtonLabelShort', {
        defaultMessage: 'Manage',
      }),
      iconType: 'gear',
      testId: 'indexActionsContextMenuButton',
      isLoading,
      items: managePopoverItems,
    };

    if (overflowOnlyItems.length > 0) {
      menuConfig.overflowOnlyItems = overflowOnlyItems;
    }

    return menuConfig;
  }, [
    discoverLocator,
    extensionsService,
    index,
    isLoading,
    isProjectChrome,
    managePopoverItems,
    notificationService,
    onSectionChange,
    showConnectionDetails,
    tab,
    tabs,
  ]);

  if (!isProjectChrome || !config) {
    return null;
  }

  return (
    <>
      <ModalHost
        ref={modalRef}
        indexNames={indexNames}
        indices={indices}
        indicesListURLParams=""
        forcemergeIndices={forcemergeIndices}
        deleteIndices={deleteIndices}
        reloadIndices={reloadIndices}
        extensionsService={extensionsService}
        getUrlForApp={getUrlForApp}
        application={application}
        http={http}
      />
      <AppMenu config={config} setAppMenu={chrome.setAppMenu} />
    </>
  );
};

IndexDetailsAppMenu.displayName = 'IndexDetailsAppMenu';
