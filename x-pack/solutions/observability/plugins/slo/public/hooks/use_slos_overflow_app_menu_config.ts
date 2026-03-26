/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { getSurveyFeedbackURL } from '@kbn/observability-shared-plugin/public';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useKibana } from './use_kibana';
import { usePluginContext } from './use_plugin_context';

/** Matches {@link FeedbackButton} survey URL. */
const SLO_FEEDBACK_FORM_URL = 'https://ela.st/slo-feedback';

export interface SlosOverflowPrimaryCreateSloOptions {
  hasWritePermission: boolean;
}

/**
 * Shared project-chrome overflow menu for SLO routes (Annotations → Manage SLOs →
 * Settings (separator) → Feedback → Documentation).
 * Optionally adds a Create SLO primary action (welcome / list).
 */
export function useSlosOverflowAppMenuConfig(
  itemIdPrefix: string,
  primaryCreateSlo?: SlosOverflowPrimaryCreateSloOptions
): AppMenuConfig {
  const { pathname } = useLocation();
  const {
    application: { navigateToUrl },
    http: { basePath },
    docLinks,
    notifications,
    cloud,
    kibanaVersion,
  } = useKibana().services;
  const { isServerless } = usePluginContext();

  const isFeedbackEnabled = notifications?.feedback?.isEnabled() ?? true;

  return useMemo((): AppMenuConfig => {
    const annotationsHref = basePath.prepend('/app/observability/annotations');
    const settingsHref = basePath.prepend(paths.slosSettings);
    const managementHref = basePath.prepend(paths.slosManagement);
    const sloDocsHref = docLinks.links.observability.slo;

    const overflowOnlyItems: AppMenuItemType[] = [];
    let order = 1;

    overflowOnlyItems.push(
      {
        order: order++,
        id: `${itemIdPrefix}-overflow-annotations`,
        label: i18n.translate('xpack.slo.home.annotations', {
          defaultMessage: 'Annotations',
        }),
        iconType: 'editorComment',
        href: annotationsHref,
        run: () => {
          void navigateToUrl(annotationsHref);
        },
      },
      {
        order: order++,
        id: `${itemIdPrefix}-overflow-manage-slos`,
        label: i18n.translate('xpack.slo.home.manage', {
          defaultMessage: 'Manage SLOs',
        }),
        iconType: 'tableOfContents',
        href: managementHref,
        run: () => {
          void navigateToUrl(managementHref);
        },
      },
      {
        order: order++,
        id: `${itemIdPrefix}-overflow-settings`,
        label: i18n.translate('xpack.slo.headerMenu.settings', {
          defaultMessage: 'Settings',
        }),
        iconType: 'gear',
        href: settingsHref,
        separator: 'above',
        run: () => {
          void navigateToUrl(settingsHref);
        },
      }
    );

    if (isFeedbackEnabled) {
      const feedbackHref = getSurveyFeedbackURL({
        formUrl: SLO_FEEDBACK_FORM_URL,
        kibanaVersion,
        isCloudEnv: cloud?.isCloudEnabled,
        isServerlessEnv: isServerless,
        sanitizedPath: pathname,
      });
      overflowOnlyItems.push({
        order: order++,
        id: `${itemIdPrefix}-overflow-feedback`,
        label: i18n.translate('xpack.slo.appMenu.feedback', {
          defaultMessage: 'Feedback',
        }),
        iconType: 'popout',
        testId: 'sloFeedbackButton',
        href: feedbackHref,
        target: '_blank',
      });
    }

    overflowOnlyItems.push({
      order: order++,
      id: `${itemIdPrefix}-overflow-documentation`,
      label: i18n.translate('xpack.slo.appMenu.documentation', {
        defaultMessage: 'Documentation',
      }),
      iconType: 'documentation',
      href: sloDocsHref,
      target: '_blank',
    });

    const createSloHref = basePath.prepend(paths.sloCreate);
    const createSloLabel = i18n.translate('xpack.slo.sloList.pageHeader.create', {
      defaultMessage: 'Create SLO',
    });

    return {
      layout: 'chromeBarV2',
      ...(primaryCreateSlo
        ? {
            primaryActionItem: {
              id: `${itemIdPrefix}-create-slo`,
              label: createSloLabel,
              iconType: 'plusInCircle',
              testId: 'slosPageCreateNewSloButton',
              href: createSloHref,
              disableButton: !primaryCreateSlo.hasWritePermission,
              run: () => {
                void navigateToUrl(createSloHref);
              },
            },
          }
        : {}),
      overflowOnlyItems,
    };
  }, [
    basePath,
    cloud?.isCloudEnabled,
    docLinks.links.observability.slo,
    isFeedbackEnabled,
    isServerless,
    itemIdPrefix,
    kibanaVersion,
    navigateToUrl,
    pathname,
    primaryCreateSlo?.hasWritePermission,
  ]);
}
