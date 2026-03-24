/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isEmpty } from 'lodash/fp';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import {
  useConfigureCasesNavigation,
  useCreateCaseNavigation,
} from '../../common/navigation/hooks';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { ErrorMessage } from '../use_push_to_service/callout/types';
import * as i18n from './translations';

/**
 * App menu for All Cases — same patterns as Dashboard top nav: link-style actions use
 * `items` (EuiHeaderLink, e.g. Share); the main action uses `primaryActionItem` with
 * `color: 'text'` only (e.g. Edit).
 *
 * API gap: AppMenu tooltips only support string `tooltipContent` for configure when
 * license errors use non-string descriptions.
 */
export const useAllCasesAppMenu = (actionsErrors: ErrorMessage[]): AppMenuConfig | undefined => {
  const { permissions } = useCasesContext();
  const { getCreateCaseUrl, navigateToCreateCase } = useCreateCaseNavigation();
  const { getConfigureCasesUrl, navigateToConfigureCases } = useConfigureCasesNavigation();

  return useMemo((): AppMenuConfig | undefined => {
    if (!permissions.create && !permissions.settings) {
      return undefined;
    }

    const config: AppMenuConfig = {};
    const hasTooltip = !isEmpty(actionsErrors);
    const firstError = actionsErrors[0];

    if (permissions.settings) {
      const configureItem: AppMenuItemType = {
        order: 1,
        id: 'cases-all-configure',
        label: i18n.CONFIGURE_CASES_BUTTON,
        iconType: 'gear',
        href: getConfigureCasesUrl(),
        run: () => {
          navigateToConfigureCases();
        },
        testId: 'configure-case-button',
        ...(hasTooltip && firstError
          ? {
              tooltipTitle: firstError.title,
              tooltipContent:
                typeof firstError.description === 'string' ? firstError.description : undefined,
            }
          : {}),
      };
      config.items = [configureItem];
    }

    if (permissions.create) {
      config.primaryActionItem = {
        id: 'cases-all-create',
        label: i18n.CREATE_CASE_TITLE,
        iconType: 'plusInCircle',
        color: 'text',
        href: getCreateCaseUrl(),
        run: () => {
          navigateToCreateCase();
        },
        testId: 'createNewCaseBtn',
      };
    }

    return config;
  }, [
    actionsErrors,
    getConfigureCasesUrl,
    getCreateCaseUrl,
    navigateToConfigureCases,
    navigateToCreateCase,
    permissions.create,
    permissions.settings,
  ]);
};
