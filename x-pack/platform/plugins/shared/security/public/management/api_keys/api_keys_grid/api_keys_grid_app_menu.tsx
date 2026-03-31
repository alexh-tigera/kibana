/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { History } from 'history';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { ChromeStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

export interface ApiKeysGridAppMenuProps {
  chrome: ChromeStart;
  history: History;
  readOnly: boolean;
  isProjectChrome: boolean;
}

/**
 * Project chrome: registers "Create API key" in the shared AppMenuBar. Classic chrome keeps the
 * action on KibanaPageTemplate.Header or the empty prompt.
 */
export const ApiKeysGridAppMenu: React.FC<ApiKeysGridAppMenuProps> = ({
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
        id: 'management-api-keys-create',
        label: i18n.translate('xpack.security.management.apiKeys.table.createButton', {
          defaultMessage: 'Create API key',
        }),
        iconType: 'plusInCircleFilled',
        run: () => {
          history.push('/create');
        },
        testId: 'apiKeysCreateTableButton',
      },
    };
  }, [history, isProjectChrome, readOnly]);

  if (!isProjectChrome) {
    return null;
  }

  return <AppMenu config={config} setAppMenu={chrome.setAppMenu} />;
};

ApiKeysGridAppMenu.displayName = 'ApiKeysGridAppMenu';
