/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import {
  getSurveyFeedbackURL,
  useBreadcrumbs,
} from '@kbn/observability-shared-plugin/public';
import { paths, SLOS_WELCOME_PATH } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useHistory, useLocation } from 'react-router-dom';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { SloOutdatedCallout } from '../../components/slo/slo_outdated_callout';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { LoadingPage } from '../loading_page';
import { CreateSloBtn } from './components/common/create_slo_btn';
import { SloList } from './components/slo_list';
import { SloListSearchBar } from './components/slo_list_search_bar';
import { SLOsOverview } from './components/slos_overview/slos_overview';

export const SLO_PAGE_ID = 'slo-page-container';

/** Matches {@link FeedbackButton} survey URL. */
const SLO_FEEDBACK_FORM_URL = 'https://ela.st/slo-feedback';

export function SlosPage() {
  const { pathname } = useLocation();
  const {
    http: { basePath },
    serverless,
    application: { navigateToUrl },
    chrome,
    docLinks,
    notifications,
    cloud,
    kibanaVersion,
  } = useKibana().services;
  const { ObservabilityPageTemplate, isServerless } = usePluginContext();
  const { hasAtLeast } = useLicense();
  const { data: permissions } = usePermissions();
  const history = useHistory();

  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const {
    data: { total } = { total: 0 },
    isLoading,
    isError,
  } = useFetchSloDefinitions({ perPage: 0 });

  const isFeedbackEnabled = notifications?.feedback?.isEnabled() ?? true;

  const slosAppMenuConfig = useMemo((): AppMenuConfig => {
    const createSloHref = basePath.prepend(paths.sloCreate);
    const createSloLabel = i18n.translate('xpack.slo.sloList.pageHeader.create', {
      defaultMessage: 'Create SLO',
    });
    const annotationsHref = basePath.prepend('/app/observability/annotations');
    const settingsHref = basePath.prepend(paths.slosSettings);
    const managementHref = basePath.prepend(paths.slosManagement);
    const sloDocsHref = docLinks.links.observability.slo;

    const overflowOnlyItems: AppMenuItemType[] = [];
    let order = 1;

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
        id: 'slos-overflow-give-feedback',
        label: i18n.translate('xpack.slo.featureFeedbackButtonLabel', {
          defaultMessage: 'Give feedback',
        }),
        iconType: 'popout',
        testId: 'sloFeedbackButton',
        href: feedbackHref,
        target: '_blank',
      });
    }

    overflowOnlyItems.push(
      {
        order: order++,
        id: 'slos-overflow-annotations',
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
        id: 'slos-overflow-slo-documentation',
        label: i18n.translate('xpack.slo.headerMenu.documentation', {
          defaultMessage: 'SLO documentation',
        }),
        iconType: 'documentation',
        href: sloDocsHref,
        target: '_blank',
      },
      {
        order: order++,
        id: 'slos-overflow-settings',
        label: i18n.translate('xpack.slo.headerMenu.settings', {
          defaultMessage: 'Settings',
        }),
        iconType: 'gear',
        href: settingsHref,
        run: () => {
          void navigateToUrl(settingsHref);
        },
      },
      {
        order: order++,
        id: 'slos-overflow-manage-slos',
        label: i18n.translate('xpack.slo.home.manage', {
          defaultMessage: 'Manage SLOs',
        }),
        iconType: 'tableOfContents',
        href: managementHref,
        run: () => {
          void navigateToUrl(managementHref);
        },
      }
    );

    return {
      layout: 'chromeBarV2',
      primaryActionItem: {
        id: 'slos-create-slo',
        label: createSloLabel,
        iconType: 'plusInCircle',
        testId: 'slosPageCreateNewSloButton',
        href: createSloHref,
        disableButton: !permissions?.hasAllWriteRequested,
        run: () => {
          void navigateToUrl(createSloHref);
        },
      },
      overflowOnlyItems,
    };
  }, [
    basePath,
    cloud?.isCloudEnabled,
    docLinks.links.observability.slo,
    isFeedbackEnabled,
    isServerless,
    kibanaVersion,
    navigateToUrl,
    pathname,
    permissions?.hasAllWriteRequested,
  ]);

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.slos),
        text: i18n.translate('xpack.slo.breadcrumbs.slosLinkText', {
          defaultMessage: 'SLOs',
        }),
        deepLinkId: 'slo',
      },
    ],
    { serverless }
  );

  useEffect(() => {
    if ((!isLoading && total === 0) || hasAtLeast('platinum') === false || isError) {
      history.replace(SLOS_WELCOME_PATH);
    }

    if (permissions?.hasAllReadRequested === false) {
      history.replace(SLOS_WELCOME_PATH);
    }
  }, [history, basePath, hasAtLeast, isError, isLoading, total, permissions]);

  if (isLoading) {
    return <LoadingPage dataTestSubj="sloListPageLoading" />;
  }

  const pageTitle = i18n.translate('xpack.slo.slosPage.', { defaultMessage: 'SLOs' });

  return (
    <ObservabilityPageTemplate
      data-test-subj="slosPage"
      pageHeader={
        isProjectChrome
          ? undefined
          : {
              pageTitle,
              rightSideItems: [<CreateSloBtn />],
            }
      }
    >
      {isProjectChrome ? (
        <AppMenu config={slosAppMenuConfig} setAppMenu={chrome.setAppMenu} />
      ) : null}
      {!isProjectChrome ? <HeaderMenu /> : null}
      <SloOutdatedCallout />
      <SloListSearchBar />
      <EuiSpacer size="m" />
      <SLOsOverview />
      <EuiSpacer size="m" />
      <SloList />
    </ObservabilityPageTemplate>
  );
}
