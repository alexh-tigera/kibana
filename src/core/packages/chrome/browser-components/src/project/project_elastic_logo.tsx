/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { LoadingIndicator } from '../shared/loading_indicator';
import {
  useProjectHome,
  useNavigateToUrl,
  useBasePath,
  useCustomBranding,
} from '../shared/chrome_hooks';

/**
 * Elastic home logo for project chrome (sidenav top or legacy header).
 */
export const ProjectElasticLogo = React.memo(() => {
  const navigateToUrl = useNavigateToUrl();
  const basePath = useBasePath();
  const homeHref = useProjectHome();
  const customBranding = useCustomBranding();
  const { logo } = customBranding;
  const { euiTheme } = useEuiTheme();

  const logoCss = css`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: ${euiTheme.size.xxl};
    cursor: pointer;
  `;

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
    <span css={logoCss} data-test-subj="nav-header-logo">
      <a onClick={navigateHome} href={fullHref}>
        <LoadingIndicator customLogo={logo} />
      </a>
    </span>
  );
});
