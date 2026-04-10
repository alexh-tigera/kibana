/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { EuiHeader, EuiHeaderSection, EuiHeaderSectionItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import React, { useCallback, useMemo } from 'react';
import { Breadcrumbs } from './breadcrumbs';
import { HeaderHelpMenu } from '../shared/header_help_menu';
import {
  HeaderNavControls,
  HeaderProjectHeaderRightNavControls,
} from '../shared/header_nav_controls';
import { BreadcrumbsWithExtensionsWrapper } from '../shared/breadcrumbs_with_extensions';
import { HeaderPageAnnouncer } from '../shared/header_page_announcer';
import { LoadingIndicator } from '../shared/loading_indicator';
import {
  useProjectBreadcrumbs,
  useProjectHome,
  useNavigateToUrl,
  useBasePath,
  useCustomBranding,
} from '../shared/chrome_hooks';

const getHeaderCss = ({ size, colors }: EuiThemeComputed) => ({
  logo: {
    container: css`
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: ${size.xxl};
      cursor: pointer;
    `,
  },
  leftHeaderSection: css`
    min-width: 0;
    flex-shrink: 1;
  `,
  breadcrumbsSectionItem: css`
    min-width: 0;
    /* Override EUI breadcrumb separator: remove rotation, enforce height */
    .euiBreadcrumb:not(:last-of-type)::after {
      block-size: 20px;
      transform: none;
    }
  `,
  leftNavcontrols: css`
    .navcontrols__separator {
      display: flex;
      margin-right: ${size.xs};
      &:after {
        background: ${colors.borderBaseSubdued};
        content: '';
        flex-shrink: 0;
        margin-block-start: ${size.xs};
        margin-block-end: 0;
        margin-inline: ${size.s};
        block-size: 20px;
        inline-size: 1px;
        transform: none;
      }
    }
  `,
});

type HeaderCss = ReturnType<typeof getHeaderCss>;

const isProjectRootBreadcrumb = (crumb: ChromeBreadcrumb | undefined): boolean => {
  if (!crumb) {
    return false;
  }
  return (
    crumb['data-test-subj'] === 'deploymentCrumb' ||
    crumb.popoverContent != null ||
    crumb.popoverProps != null
  );
};

/** Must match `SPACES_PROJECT_BREADCRUMB_TEST_SUBJ` in the spaces plugin (`space_project_breadcrumb_registrar.tsx`). */
const SPACES_PROJECT_BREADCRUMB_TEST_SUBJ = 'spacesNavBreadcrumb';

const isSpacesProjectBreadcrumb = (crumb: ChromeBreadcrumb | undefined): boolean =>
  crumb?.['data-test-subj'] === SPACES_PROJECT_BREADCRUMB_TEST_SUBJ;

/** POC: compact header action hit targets (~32px) vs default EUI header chip (~40px / size.xxl). */
const PROJECT_HEADER_ACTION_BUTTON_PX = 32;
const PROJECT_HEADER_ACTION_ICON_PX = 16;

const getProjectHeaderRightActionsCss = (_euiTheme: EuiThemeComputed) => css`
  gap: 4px;

  .euiHeaderSectionItemButton {
    box-sizing: border-box;
    width: ${PROJECT_HEADER_ACTION_BUTTON_PX}px;
    min-width: ${PROJECT_HEADER_ACTION_BUTTON_PX}px;
    max-width: ${PROJECT_HEADER_ACTION_BUTTON_PX}px;
    min-height: ${PROJECT_HEADER_ACTION_BUTTON_PX}px;
    height: ${PROJECT_HEADER_ACTION_BUTTON_PX}px;
    max-height: ${PROJECT_HEADER_ACTION_BUTTON_PX}px;
    min-inline-size: ${PROJECT_HEADER_ACTION_BUTTON_PX}px;
    max-inline-size: ${PROJECT_HEADER_ACTION_BUTTON_PX}px;
    /* No horizontal padding: xs + ~24px avatar was ~40px wide; square box centers content. */
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .euiHeaderSectionItemButton svg {
    width: ${PROJECT_HEADER_ACTION_ICON_PX}px;
    height: ${PROJECT_HEADER_ACTION_ICON_PX}px;
  }
`;

const Logo = ({ logoCss }: { logoCss: HeaderCss['logo'] }) => {
  const navigateToUrl = useNavigateToUrl();
  const basePath = useBasePath();
  const homeHref = useProjectHome();
  const customBranding = useCustomBranding();
  const { logo } = customBranding;

  let fullHref: string | undefined;
  if (homeHref) {
    fullHref = basePath.prepend(homeHref);
  }

  const navigateHome = useCallback(
    (event: React.MouseEvent) => {
      if (fullHref) {
        navigateToUrl(fullHref);
      }
      event.preventDefault();
    },
    [fullHref, navigateToUrl]
  );

  return (
    <span css={logoCss.container} data-test-subj="nav-header-logo">
      <a onClick={navigateHome} href={fullHref}>
        <LoadingIndicator customLogo={logo} />
      </a>
    </span>
  );
};

export const ProjectHeader = React.memo(() => {
  const breadcrumbs = useProjectBreadcrumbs();
  const { euiTheme } = useEuiTheme();
  const headerCss = getHeaderCss(euiTheme);
  const { logo: logoCss } = headerCss;

  const globalHeaderBreadcrumbs = useMemo(() => {
    const first = breadcrumbs[0];
    if (!isProjectRootBreadcrumb(first)) {
      return [];
    }
    const second = breadcrumbs[1];
    if (isSpacesProjectBreadcrumb(second)) {
      return [first, second];
    }
    return [first];
  }, [breadcrumbs]);

  const topBarStyles = css`
    box-shadow: none !important;
    background-color: ${euiTheme.colors.backgroundTransparent};
    border-bottom-color: ${euiTheme.colors.backgroundTransparent};
    padding-inline: 4px 8px;
  `;

  return (
    <>
      <header data-test-subj="kibanaProjectHeader">
        <div id="globalHeaderBars" data-test-subj="headerGlobalNav" className="header__bars">
          <EuiHeader position={'static'} className="header__firstBar" css={topBarStyles}>
            <EuiHeaderSection grow={false} css={headerCss.leftHeaderSection}>
              <EuiHeaderSectionItem>
                <HeaderPageAnnouncer breadcrumbs={breadcrumbs} />
                <Logo logoCss={logoCss} />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem css={headerCss.leftNavcontrols}>
                <HeaderNavControls
                  position="left"
                  append={<div className="navcontrols__separator" />}
                />
              </EuiHeaderSectionItem>

              {globalHeaderBreadcrumbs.length > 0 ? (
                <EuiHeaderSectionItem css={headerCss.breadcrumbsSectionItem}>
                  <BreadcrumbsWithExtensionsWrapper>
                    <Breadcrumbs breadcrumbs={globalHeaderBreadcrumbs} />
                  </BreadcrumbsWithExtensionsWrapper>
                </EuiHeaderSectionItem>
              ) : null}
            </EuiHeaderSection>

            <EuiHeaderSection side="right" css={getProjectHeaderRightActionsCss(euiTheme)}>
              <EuiHeaderSectionItem>
                <HeaderNavControls position="center" />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem>
                <HeaderHelpMenu />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem
                css={css`
                  gap: ${euiTheme.size.s};
                `}
              >
                <HeaderProjectHeaderRightNavControls />
              </EuiHeaderSectionItem>
            </EuiHeaderSection>
          </EuiHeader>
        </div>
      </header>
    </>
  );
});
