/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useParams } from 'react-router-dom';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { useKibana } from '../../hooks/use_kibana';
import { useSlosOverflowAppMenuConfig } from '../../hooks/use_slos_overflow_app_menu_config';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { SloEditForm } from './components/slo_edit_form';
import { useSloFormValues } from './hooks/use_slo_form_values';

export function SloEditPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
    serverless,
    chrome,
  } = useKibana().services;
  const { sloId } = useParams<{ sloId: string | undefined }>();
  const { initialValues, isLoading, isEditMode, slo } = useSloFormValues(sloId);

  const { data: permissions } = usePermissions();
  const { ObservabilityPageTemplate } = usePluginContext();
  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');

  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const sloEditAppMenuConfig = useSlosOverflowAppMenuConfig('slos-slo-edit');

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.slos),
        text: i18n.translate('xpack.slo.breadcrumbs.sloLabel', {
          defaultMessage: 'SLOs',
        }),
        deepLinkId: 'slo',
      },
      ...(!!slo
        ? [
            {
              href: basePath.prepend(paths.sloDetails(slo.id, slo.instanceId)),
              text: slo!.name,
            },
          ]
        : []),
      {
        text: isEditMode
          ? i18n.translate('xpack.slo.breadcrumbs.sloEditLabel', {
              defaultMessage: 'Edit',
            })
          : i18n.translate('xpack.slo.breadcrumbs.sloCreateLabel', {
              defaultMessage: 'Create',
            }),
      },
    ],
    { serverless }
  );

  useEffect(() => {
    if (hasRightLicense === false || permissions?.hasAllReadRequested === false) {
      navigateToUrl(basePath.prepend(paths.slosWelcome));
    }

    if (permissions?.hasAllWriteRequested === false) {
      navigateToUrl(basePath.prepend(paths.slos));
    }
  }, [hasRightLicense, permissions, navigateToUrl, basePath]);

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: isEditMode
          ? i18n.translate('xpack.slo.sloEditPageTitle', {
              defaultMessage: 'Edit SLO',
            })
          : i18n.translate('xpack.slo.sloCreatePageTitle', {
              defaultMessage: 'Create new SLO',
            }),
        bottomBorder: false,
      }}
      data-test-subj="sloEditPage"
    >
      {isProjectChrome ? (
        <AppMenu config={sloEditAppMenuConfig} setAppMenu={chrome.setAppMenu} />
      ) : null}
      {!isProjectChrome ? <HeaderMenu /> : null}
      {isLoading ? (
        <EuiLoadingSpinner size="xl" data-test-subj="sloEditLoadingSpinner" />
      ) : (
        <SloEditForm slo={slo} formSettings={{ isEditMode }} initialValues={initialValues} />
      )}
    </ObservabilityPageTemplate>
  );
}
