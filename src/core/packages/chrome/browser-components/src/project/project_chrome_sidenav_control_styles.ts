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
import { useMemo } from 'react';

/**
 * Space, search, and profile use EuiHeaderSectionItemButton (header bar sizing).
 * Help uses EuiButtonIcon size="s" (height matches EUI `euiButtonSizeMap` size `s` → `euiTheme.size.xl`).
 * This aligns compact triggers to the same footprint as Help (square icon button).
 */
export const useProjectChromeSidenavCompactControlStyles = () => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () => css`
      .euiHeaderSectionItemButton {
        box-sizing: border-box;
        block-size: ${euiTheme.size.xl};
        inline-size: ${euiTheme.size.xl};
        min-block-size: ${euiTheme.size.xl};
        max-block-size: ${euiTheme.size.xl};
        min-inline-size: ${euiTheme.size.xl};
        max-inline-size: ${euiTheme.size.xl};
        padding-inline: ${euiTheme.size.xs};
        flex-grow: 0;
        flex-shrink: 0;
      }
      .euiHeaderSectionItemButton .euiIcon {
        block-size: ${euiTheme.size.m};
        inline-size: ${euiTheme.size.m};
      }
      .euiHeaderSectionItemButton .euiSkeletonRectangle {
        block-size: ${euiTheme.size.l};
        inline-size: ${euiTheme.size.l};
      }
      .euiHeaderSectionItemButton img,
      .euiHeaderSectionItemButton picture img {
        max-block-size: ${euiTheme.size.l};
        max-inline-size: ${euiTheme.size.l};
      }
      /* Help uses EuiButtonIcon (navFooter); match the same square as header section buttons */
      [data-test-subj='kibanaProjectChromeNavFooter'] [data-test-subj='helpMenuButton'] {
        box-sizing: border-box;
        block-size: ${euiTheme.size.xl};
        inline-size: ${euiTheme.size.xl};
        min-block-size: ${euiTheme.size.xl};
        max-block-size: ${euiTheme.size.xl};
        min-inline-size: ${euiTheme.size.xl};
        max-inline-size: ${euiTheme.size.xl};
        flex-grow: 0;
        flex-shrink: 0;
      }
    `,
    [euiTheme]
  );
};
