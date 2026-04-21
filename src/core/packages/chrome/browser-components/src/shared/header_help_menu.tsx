/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import {
  EuiContextMenu,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { useIsServerless, useKibanaVersion } from '@kbn/react-env';
import { css } from '@emotion/react';
import { isModifiedOrPrevented } from './nav_link';
import { useNavigateToUrl } from './chrome_hooks';
import { useHelpLinks } from './help_links_hooks';
import type { HelpMenuLinkItem } from './help_menu_links';

type ItemClickHandler = (opts: {
  onClick?: () => void;
  href?: string;
  isExternal?: boolean;
}) => (e: MouseEvent) => void;

const createItemClickHandler =
  ({
    closeMenu,
    navigateToUrl,
  }: {
    closeMenu: () => void;
    navigateToUrl: (url: string) => void;
  }): ItemClickHandler =>
  ({ onClick, href, isExternal }) =>
  (e: MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    } else if (
      href &&
      !isExternal &&
      !isModifiedOrPrevented(e as MouseEvent<HTMLElement>) &&
      e.button === 0
    ) {
      e.preventDefault();
      navigateToUrl(href);
    }
    closeMenu();
  };

const createMenuItem = (
  options: HelpMenuLinkItem,
  onItemClick: ItemClickHandler
): EuiContextMenuPanelItemDescriptor => ({
  name: options.name,
  key: options.key,
  icon: options.icon,
  'data-test-subj': options.dataTestSubj,
  ...(options.href ? { href: options.href } : {}),
  target: options.target,
  rel: options.rel,
  onClick: onItemClick({
    onClick: options.onClick,
    href: options.href,
    isExternal: options.isExternal,
  }),
});

interface HeaderHelpMenuProps {
  renderButton?: (props: {
    isOpen: boolean;
    toggleMenu: () => void;
  }) => NonNullable<React.ReactNode>;
}

export const HeaderHelpMenu = ({ renderButton }: HeaderHelpMenuProps = {}) => {
  const navigateToUrl = useNavigateToUrl();
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isServerless = useIsServerless();
  const kibanaVersion = useKibanaVersion();

  const appNameStyle = useMemo(
    () => css`
      font-weight: ${euiTheme.font.weight.bold};
    `,
    [euiTheme.font.weight.bold]
  );

  const {
    global: globalHelpLinks = [],
    default: defaultContentLinks = [],
    extension: helpExtensionLinks,
  } = useHelpLinks();

  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  const handleItemClick = useMemo(
    () => createItemClickHandler({ closeMenu, navigateToUrl }),
    [closeMenu, navigateToUrl]
  );

  const items = useMemo(() => {
    const menuItems: EuiContextMenuPanelItemDescriptor[] = [];

    // Global extension links (e.g. cloud data migration)
    globalHelpLinks.forEach((link) => {
      menuItems.push(createMenuItem(link, handleItemClick));
    });

    // Default links (Kibana docs, Ask Elastic, GitHub)
    defaultContentLinks.forEach((link) => {
      menuItems.push(createMenuItem(link, handleItemClick));
    });

    // App-specific extension links
    if (helpExtensionLinks) {
      menuItems.push({ isSeparator: true, key: 'extension-separator' });

      menuItems.push({
        renderItem: () => (
          <EuiContextMenuItem css={appNameStyle}>{helpExtensionLinks?.label}</EuiContextMenuItem>
        ),
        key: 'extension-title',
      });

      helpExtensionLinks.items?.forEach((link) => {
        menuItems.push(createMenuItem(link, handleItemClick));
      });
    }

    return menuItems;
  }, [helpExtensionLinks, defaultContentLinks, globalHelpLinks, handleItemClick, appNameStyle]);

  const button = renderButton ? (
    renderButton({ isOpen, toggleMenu })
  ) : (
    <EuiHeaderSectionItemButton
      aria-expanded={isOpen}
      aria-haspopup="true"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel', {
        defaultMessage: 'Help menu',
      })}
      onClick={toggleMenu}
    >
      <EuiIcon type="question" size="m" aria-hidden={true} />
    </EuiHeaderSectionItemButton>
  );

  return (
    <EuiPopover
      anchorPosition="downRight"
      button={button}
      closePopover={closeMenu}
      data-test-subj="helpMenuButton"
      id="headerHelpMenu"
      isOpen={isOpen}
      repositionOnScroll
      panelPaddingSize="none"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuAriaLabel', {
        defaultMessage: 'Help menu',
      })}
    >
      <EuiContextMenu
        initialPanelId="helpMenu"
        size="s"
        panels={[
          {
            id: 'helpMenu',
            title: (
              <EuiFlexGroup responsive={false}>
                <EuiFlexItem>
                  <FormattedMessage
                    id="core.ui.chrome.headerGlobalNav.helpMenuTitle"
                    defaultMessage="Help"
                  />
                </EuiFlexItem>
                {!isServerless && (
                  <EuiFlexItem grow={false} data-test-subj="kbnVersionString">
                    <FormattedMessage
                      id="core.ui.chrome.headerGlobalNav.helpMenuVersion"
                      defaultMessage="v {version}"
                      values={{ version: kibanaVersion }}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            ),
            items,
          },
        ]}
      />
    </EuiPopover>
  );
};
