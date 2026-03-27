/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSObject } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState, type ReactNode } from 'react';

/** Caps width at 400px on large viewports; on narrow viewports does not exceed the viewport. */
const HEADER_BADGES_POPOVER_MAX_WIDTH = 'min(400px, 90vw)';

export interface ProjectHeaderBadgeGroupProps {
  badges: ReactNode[];
  badgeGroupCss: CSSObject;
}

export const ProjectHeaderBadgeGroup = ({
  badges,
  badgeGroupCss,
}: ProjectHeaderBadgeGroupProps) => {
  const { euiTheme } = useEuiTheme();
  const isCollapsedLayout = useIsWithinBreakpoints(['xs', 's', 'm']);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (!isCollapsedLayout) {
      setIsPopoverOpen(false);
    }
  }, [isCollapsedLayout]);

  const count = badges.length;

  const collapsedTriggerAriaLabel = useMemo(
    () =>
      i18n.translate('core.ui.chrome.appMenu.headerBadgesCollapsedTriggerAriaLabel', {
        defaultMessage: 'Open menu with {count, plural, one {# badge} other {# badges}}',
        values: { count },
      }),
    [count]
  );

  const badgePopoverWrapCss: CSSObject = useMemo(
    () => ({
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      alignContent: 'flex-start',
      gap: euiTheme.size.s,
      maxWidth: '100%',
    }),
    [euiTheme.size.s]
  );

  const badgePopoverCellCss: CSSObject = useMemo(
    () => ({
      boxSizing: 'border-box',
      flex: '0 0 auto',
      maxWidth: '100%',
      minWidth: 0,
      width: 'max-content',
    }),
    []
  );

  if (isCollapsedLayout) {
    const trigger = (
      <EuiBadge
        color="hollow"
        data-test-subj="kibanaProjectHeaderBadgeGroupCollapsed"
        onClick={() => setIsPopoverOpen((open) => !open)}
        onClickAriaLabel={collapsedTriggerAriaLabel}
        tabIndex={-1}
      >
        +{count}
      </EuiBadge>
    );

    return (
      <div css={badgeGroupCss}>
        <EuiPopover
          anchorPosition="downLeft"
          button={trigger}
          closePopover={() => setIsPopoverOpen(false)}
          hasArrow={false}
          isOpen={isPopoverOpen}
          panelPaddingSize="m"
          panelStyle={{ maxWidth: HEADER_BADGES_POPOVER_MAX_WIDTH }}
        >
          <div css={badgePopoverWrapCss} data-test-subj="kibanaProjectHeaderBadgeGroupPopover">
            {badges.map((badge, index) => (
              <div key={index} css={badgePopoverCellCss}>
                {badge}
              </div>
            ))}
          </div>
        </EuiPopover>
      </div>
    );
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="kibanaProjectHeaderBadgeGroup"
      gutterSize="xs"
      justifyContent="flexStart"
      responsive={false}
      wrap
      css={badgeGroupCss}
    >
      {badges.map((badge, index) => (
        <EuiFlexItem key={index} grow={false}>
          {badge}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
