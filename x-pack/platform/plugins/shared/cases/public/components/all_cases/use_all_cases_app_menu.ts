/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isEmpty } from 'lodash/fp';
import useObservable from 'react-use/lib/useObservable';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import {
  useConfigureCasesNavigation,
  useCreateCaseNavigation,
} from '../../common/navigation/hooks';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { ErrorMessage } from '../use_push_to_service/callout/types';
import * as i18n from './translations';

/**
 * App menu for All Cases — same patterns as Dashboard top nav: link-style actions use
 * `items` (EuiHeaderLink, e.g. Share); primary/secondary actions use default app menu
 * text-style buttons only.
 *
 * Project chrome: Settings lives in overflow (⋯) only (`chromeBarV2`), not inline with Create.
 *
 * API gap: AppMenu tooltips only support string `tooltipContent` for configure when
 * license errors use non-string descriptions.
 */
export const useAllCasesAppMenu = (actionsErrors: ErrorMessage[]): AppMenuConfig | undefined => {
  const { permissions } = useCasesContext();
  const { chrome } = useKibana().services;
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';
  const { getCreateCaseUrl, navigateToCreateCase } = useCreateCaseNavigation();
  const { getConfigureCasesUrl, navigateToConfigureCases } = useConfigureCasesNavigation();

  return useMemo((): AppMenuConfig | undefined => {
    if (!permissions.create && !permissions.settings) {
      return undefined;
    }

    const hasTooltip = !isEmpty(actionsErrors);
    const firstError = actionsErrors[0];

    const configureItem: AppMenuItemType | undefined = permissions.settings
      ? {
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
        }
      : undefined;

    const createPrimary = permissions.create
      ? {
          id: 'cases-all-create',
          label: i18n.CREATE_CASE_TITLE,
          iconType: 'plusInCircle',
          href: getCreateCaseUrl(),
          run: () => {
            navigateToCreateCase();
          },
          testId: 'createNewCaseBtn',
        }
      : undefined;

    if (isProjectChrome) {
      const projectConfig: AppMenuConfig = {
        layout: 'chromeBarV2',
      };

      if (configureItem) {
        const { order: _order, ...configureOverflow } = configureItem;
        projectConfig.overflowOnlyItems = [{ ...configureOverflow, order: 10 }];
      }

      if (createPrimary) {
        projectConfig.primaryActionItem = createPrimary;
      }

      return projectConfig;
    }

    const config: AppMenuConfig = {};

    if (configureItem) {
      config.items = [configureItem];
    }

    if (createPrimary) {
      config.primaryActionItem = createPrimary;
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
    isProjectChrome,
  ]);
};
