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
import React from 'react';
import { HeaderNavControls } from '../shared/header_nav_controls';
import { ProjectElasticLogo } from './project_elastic_logo';
import { useProjectChromeSidenavCompactControlStyles } from './project_chrome_sidenav_control_styles';

/**
 * Project mode: Elastic logo, space / project controls, and search above the solution
 * `SideNav.Logo` row.
 */
export const ProjectChromeNavTop = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const compactControlStyles = useProjectChromeSidenavCompactControlStyles();

  /* Vertical stack: Elastic logo, then Space, then Search — aligned with primary nav below. */
  const stackStyles = css`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: ${euiTheme.size.s};
    width: 100%;
  `;

  const logoRowStyles = css`
    display: flex;
    justify-content: center;
    width: 100%;
  `;

  const navControlsColumnStyles = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${euiTheme.size.xs};
    width: 100%;
    ${compactControlStyles}
  `;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        margin-top: ${euiTheme.size.m};
        padding-top: ${euiTheme.size.s};
      `}
      data-test-subj="kibanaProjectChromeNavTop"
    >
      <div css={stackStyles}>
        <div css={logoRowStyles}>
          <ProjectElasticLogo />
        </div>
        <div css={navControlsColumnStyles}>
          <HeaderNavControls position="left" />
          <HeaderNavControls position="center" />
        </div>
      </div>
    </div>
  );
});
