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
import type { ChromeNavControl } from '@kbn/core-chrome-browser';
import { HeaderExtension } from '../shared/header_extension';
import { HeaderHelpMenu } from '../shared/header_help_menu';
import { useProjectChromeRightControls } from '../shared/chrome_hooks';
import { useProjectChromeSidenavCompactControlStyles } from './project_chrome_sidenav_control_styles';

const ProjectChromeNavControl = ({ control }: { control: ChromeNavControl }) => (
  <div
    css={css`
      display: flex;
      align-items: center;
      justify-content: center;
    `}
  >
    <HeaderExtension extension={control.content ?? control.mount} />
  </div>
);

const ProjectChromeHelpExtras = () => {
  const controls = useProjectChromeRightControls('helpMenuExtras');
  return (
    <EuiFlexRowWrap>
      {controls.map((c, i) => (
        <ProjectChromeNavControl key={i} control={c} />
      ))}
    </EuiFlexRowWrap>
  );
};

const EuiFlexRowWrap = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: ${euiTheme.size.s};
        width: 100%;
      `}
    >
      {children}
    </div>
  );
};

/**
 * Project mode: user profile + help (with news/feedback embedded in the help menu)
 * in the sidenav footer, after solution footer items.
 */
export const ProjectChromeNavFooter = React.memo(() => {
  const profileControls = useProjectChromeRightControls('navFooterProfile');
  const { euiTheme } = useEuiTheme();
  const compactControlStyles = useProjectChromeSidenavCompactControlStyles();

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: ${euiTheme.size.s};
        width: 100%;
        ${compactControlStyles}
      `}
      data-test-subj="kibanaProjectChromeNavFooter"
    >
      <div
        css={css`
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: ${euiTheme.size.xs};
          width: 100%;
        `}
      >
        {profileControls.map((c, i) => (
          <ProjectChromeNavControl key={i} control={c} />
        ))}
      </div>
      <HeaderHelpMenu
        displayMode="navFooter"
        projectChromeExtras={<ProjectChromeHelpExtras />}
      />
    </div>
  );
});
