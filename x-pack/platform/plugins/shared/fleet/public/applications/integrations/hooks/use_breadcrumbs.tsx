/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import type { ChromeBreadcrumb } from '@kbn/core/public';

import type { Page, DynamicPagePathValues } from '../constants';
import { INTEGRATIONS_BASE_PATH, pagePathGetters } from '../constants';

import { useStartServices } from '.';

const BASE_BREADCRUMB: ChromeBreadcrumb = {
  href: pagePathGetters.integrations()[1],
  text: i18n.translate('xpack.fleet.breadcrumbs.integrationsAppTitle', {
    defaultMessage: 'Integrations',
  }),
  deepLinkId: 'integrations',
};

const breadcrumbGetters: {
  [key in Page]?: (values: DynamicPagePathValues) => ChromeBreadcrumb[];
} = {
  integrations: () => [BASE_BREADCRUMB],
  integrations_all: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.allIntegrationsPageTitle', {
        defaultMessage: 'Browse integrations',
      }),
    },
  ],
  integrations_installed: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.installedIntegrationsPageTitle', {
        defaultMessage: 'Installed integrations',
      }),
    },
  ],
  integration_create: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.createIntegrationPageTitle', {
        defaultMessage: 'Create integration',
      }),
    },
  ],
  integration_details_overview: ({ pkgTitle }) => [BASE_BREADCRUMB, { text: pkgTitle }],
  integration_policy_edit: ({ pkgTitle, pkgkey, policyName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integration_details_policies({ pkgkey })[1],
      text: pkgTitle,
    },
    { text: policyName },
  ],
  integration_policy_copy: ({ pkgTitle, pkgkey, policyName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integration_details_policies({ pkgkey })[1],
      text: pkgTitle,
    },
    { text: policyName },
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.copyPackagePolicyPageTitle', {
        defaultMessage: 'Copy integration',
      }),
    },
  ],
  integration_policy_upgrade: ({ pkgTitle, pkgkey, policyName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integration_details_policies({ pkgkey })[1],
      text: pkgTitle,
    },
    { text: policyName },
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.upgradePackagePolicyPageTitle', {
        defaultMessage: 'Upgrade integration ',
      }),
    },
  ],
  integration_policy_edit_from_installed: ({ policyName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integrations_installed({})[1],
      text: i18n.translate('xpack.fleet.breadcrumbs.installedIntegrationsPageTitle', {
        defaultMessage: 'Installed integrations',
      }),
    },
    { text: policyName },
  ],
  integration_policy_copy_from_installed: ({ policyName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integrations_installed({})[1],
      text: i18n.translate('xpack.fleet.breadcrumbs.installedIntegrationsPageTitle', {
        defaultMessage: 'Installed integrations',
      }),
    },
    { text: policyName },
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.copyPackagePolicyPageTitle', {
        defaultMessage: 'Copy integration',
      }),
    },
  ],
};

const EMPTY_DYNAMIC_PATH_VALUES: DynamicPagePathValues = {};

export function useBreadcrumbs(
  page: Page,
  values: DynamicPagePathValues = EMPTY_DYNAMIC_PATH_VALUES
) {
  const { chrome, http, application } = useStartServices();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const valuesKey = JSON.stringify(values);

  const breadcrumbs = useMemo((): ChromeBreadcrumb[] => {
    const getter = breadcrumbGetters[page];
    if (!getter) {
      return [];
    }

    let crumbs = getter(values);
    if (
      chromeStyle === 'project' &&
      (page === 'integrations_all' || page === 'integrations_installed')
    ) {
      crumbs = [BASE_BREADCRUMB];
    }

    return crumbs.map((breadcrumb) => {
      const href = breadcrumb.href
        ? http.basePath.prepend(`${INTEGRATIONS_BASE_PATH}${breadcrumb.href}`)
        : undefined;
      return {
        ...breadcrumb,
        href,
        onClick: href
          ? (ev: React.MouseEvent) => {
              ev.preventDefault();
              application.navigateToUrl(href);
            }
          : undefined,
      };
    });
  }, [application, chromeStyle, http, page, values, valuesKey]);

  useEffect(() => {
    const docTitle: string[] = [...breadcrumbs]
      .reverse()
      .map((breadcrumb) => breadcrumb.text as string);

    chrome.docTitle.change(docTitle);
    chrome.setBreadcrumbs(breadcrumbs);
  }, [breadcrumbs, chrome]);
}
