/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { ChromeStart, ScopedHistory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

export interface UsersGridAppMenuProps {
  chrome: ChromeStart;
  history: ScopedHistory;
  readOnly: boolean;
  isProjectChrome: boolean;
}

/**
 * Project chrome: registers "Create user" in the shared AppMenuBar. Classic chrome keeps the
 * action on EuiPageHeader.
 */
export const UsersGridAppMenu: React.FC<UsersGridAppMenuProps> = ({
  chrome,
  history,
  readOnly,
  isProjectChrome,
}) => {
  const config = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }
    if (readOnly) {
      return undefined;
    }
    return {
      layout: 'chromeBarV2',
      primaryActionItem: {
        id: 'management-users-create-user',
        label: i18n.translate('xpack.security.management.users.createNewUserButtonLabel', {
          defaultMessage: 'Create user',
        }),
        iconType: 'plusInCircleFilled',
        run: () => {
          history.push('/create');
        },
        testId: 'createUserButton',
      },
    };
  }, [history, isProjectChrome, readOnly]);

  if (!isProjectChrome) {
    return null;
  }

  return <AppMenu config={config} setAppMenu={chrome.setAppMenu} />;
};

UsersGridAppMenu.displayName = 'UsersGridAppMenu';
