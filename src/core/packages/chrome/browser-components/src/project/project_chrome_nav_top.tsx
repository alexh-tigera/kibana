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

  const clusterStyles = css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
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
        padding-bottom: ${euiTheme.size.s};
      `}
      data-test-subj="kibanaProjectChromeNavTop"
    >
      <div css={clusterStyles}>
        <ProjectElasticLogo />
        <HeaderNavControls position="left" />
        <HeaderNavControls position="center" />
      </div>
    </div>
  );
});
