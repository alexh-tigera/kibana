/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { AppMenuHeaderTab } from '@kbn/core-chrome-app-menu-components';
import { HeaderAppMenu } from '../shared/header_app_menu';
import { HeaderActionMenu } from '../shared/header_action_menu';
import {
  useAppMenu,
  useHasAppMenuConfig,
  useProjectBreadcrumbs,
  useNavigateToUrl,
  useBasePath,
  useNavLinks,
  useCurrentAppId,
} from '../shared/chrome_hooks';

const getAccessibleTitleFromBreadcrumb = (
  breadcrumb: ChromeBreadcrumb | undefined
): string | undefined => {
  if (!breadcrumb) {
    return undefined;
  }
  if (typeof breadcrumb['aria-label'] === 'string' && breadcrumb['aria-label'].length > 0) {
    return breadcrumb['aria-label'];
  }
  if (typeof breadcrumb.text === 'string' && breadcrumb.text.length > 0) {
    return breadcrumb.text;
  }
  return undefined;
};

const noop = () => {};

const canNavigateToParent = (crumb: ChromeBreadcrumb | undefined): boolean => {
  if (!crumb) {
    return false;
  }
  return Boolean(crumb.onClick || crumb.href);
};

const useAppMenuBarStyles = (euiTheme: UseEuiTheme['euiTheme']) =>
  useMemo(() => {
    const root = {
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: euiTheme.size.m,
      padding: `${euiTheme.size.m}`,
      background: euiTheme.colors.backgroundBasePlain,
      borderBottom: euiTheme.border.thin,
      marginBottom: `-${euiTheme.border.width.thin}`,
      height: '100%',
      '&:hover .appMenuBar__globalActions': {
        opacity: 1,
        pointerEvents: 'auto' as const,
      },
      '&:focus-within .appMenuBar__globalActions': {
        opacity: 1,
        pointerEvents: 'auto' as const,
      },
    };

    const leftCluster = {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: '4px',
    };

    const titleSection = {
      flex: '0 1 auto',
      minWidth: 0,
      maxWidth: '100%',
      display: 'flex',
      alignItems: 'center',
    };

    const globalActions = {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: euiTheme.size.xs,
      opacity: 0,
      pointerEvents: 'none' as const,
      transition: `opacity ${euiTheme.animation.fast} ease`,
    };

    const iconButtonSubdued = {
      color: euiTheme.colors.textSubdued,
    };

    const titleEuiTitle = {
      margin: 0,
      minWidth: 0,
      maxWidth: '100%',
      // color: euiTheme.colors.textSubdued,
    };

    const titleEuiTitleReact = {
      ...titleEuiTitle,
      display: 'flex',
      alignItems: 'center',
    };

    const menuSection = {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
    };

    const tabsSection = {
      flex: '1 1 auto',
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
    };

    return {
      root,
      leftCluster,
      titleSection,
      tabsSection,
      globalActions,
      iconButtonSubdued,
      titleEuiTitle,
      titleEuiTitleReact,
      menuSection,
    };
  }, [euiTheme]);

const AppMenuBarHeaderTabs = ({ tabs }: { tabs: AppMenuHeaderTab[] }) => (
  <EuiTabs
    bottomBorder={false}
    size="s"
    data-test-subj="kibanaProjectHeaderAppMenuTabs"
    css={{ marginBottom: 0 }}
  >
    {tabs.map((tab) => (
      <EuiTab
        key={tab.id}
        href={tab.href}
        isSelected={tab.isSelected}
        onClick={tab.onClick}
        data-test-subj={tab.testId}
      >
        {tab.label}
      </EuiTab>
    ))}
  </EuiTabs>
);

export const AppMenuBar = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const styles = useAppMenuBarStyles(euiTheme);
  const appMenuConfig = useAppMenu();
  const headerTabs = appMenuConfig?.headerTabs;
  const hasAppMenuConfig = useHasAppMenuConfig();
  const navigateToUrl = useNavigateToUrl();
  const basePath = useBasePath();
  const breadcrumbs = useProjectBreadcrumbs();
  const navLinks = useNavLinks();
  const currentAppId = useCurrentAppId();
  const currentAppTitleFromNav = useMemo(() => {
    if (!currentAppId) {
      return undefined;
    }
    return navLinks.find((link) => link.id === currentAppId)?.title;
  }, [navLinks, currentAppId]);
  const titleWhenNoProjectBreadcrumb = useMemo(
    () =>
      currentAppTitleFromNav ??
      i18n.translate('core.ui.chrome.appMenu.titleFallbackWithoutBreadcrumb', {
        defaultMessage: 'Page',
      }),
    [currentAppTitleFromNav]
  );
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  const parentBreadcrumb =
    breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2] : undefined;
  const showBackToParent = Boolean(parentBreadcrumb) && canNavigateToParent(parentBreadcrumb);
  const titleContent = lastBreadcrumb?.text;
  const hasTitle = titleContent != null && titleContent !== '' && typeof titleContent !== 'boolean';

  const accessibleTitle = getAccessibleTitleFromBreadcrumb(lastBreadcrumb);
  const reactNodeAriaLabel =
    hasTitle && typeof titleContent !== 'string' && accessibleTitle
      ? { 'aria-label': accessibleTitle }
      : {};

  const parentAccessibleLabel = getAccessibleTitleFromBreadcrumb(parentBreadcrumb);
  const backAriaLabel = parentAccessibleLabel
    ? i18n.translate('core.ui.chrome.appMenu.backToPageAriaLabel', {
        defaultMessage: 'Back to {pageTitle}',
        values: { pageTitle: parentAccessibleLabel },
      })
    : i18n.translate('core.ui.chrome.appMenu.backButtonAriaLabel', {
        defaultMessage: 'Back',
      });

  const onBackClick = (event: React.MouseEvent) => {
    if (!parentBreadcrumb) {
      return;
    }
    if (parentBreadcrumb.onClick) {
      parentBreadcrumb.onClick(event as React.MouseEvent<HTMLElement>);
      return;
    }
    if (parentBreadcrumb.href) {
      event.preventDefault();
      const { href } = parentBreadcrumb;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        navigateToUrl(href);
      } else {
        navigateToUrl(basePath.prepend(href));
      }
    }
  };

  return (
    <div
      className="header__actionMenu"
      data-test-subj="kibanaProjectHeaderActionMenu"
      css={styles.root}
    >
      <div css={styles.leftCluster}>
        {showBackToParent ? (
          <EuiButtonIcon
            aria-label={backAriaLabel}
            color="text"
            css={styles.iconButtonSubdued}
            data-test-subj="kibanaProjectHeaderAppMenuBack"
            display="empty"
            iconType="chevronLimitLeft"
            onClick={onBackClick}
            size="xs"
            type="button"
          />
        ) : null}
        <div css={styles.titleSection}>
          {hasTitle ? (
            typeof titleContent === 'string' ? (
              <EuiTitle size="xs" css={styles.titleEuiTitle}>
                <span className="eui-textTruncate" title={titleContent}>
                  {titleContent}
                </span>
              </EuiTitle>
            ) : (
              <EuiTitle size="xs" css={styles.titleEuiTitleReact} {...reactNodeAriaLabel}>
                <span className="eui-textTruncate">{titleContent}</span>
              </EuiTitle>
            )
          ) : (
            <EuiTitle size="xs" css={styles.titleEuiTitle}>
              <span className="eui-textTruncate" title={titleWhenNoProjectBreadcrumb}>
                {titleWhenNoProjectBreadcrumb}
              </span>
            </EuiTitle>
          )}
        </div>
        {headerTabs && headerTabs.length > 0 ? (
          <div css={styles.tabsSection}>
            <AppMenuBarHeaderTabs tabs={headerTabs} />
          </div>
        ) : null}
        <div
          className="appMenuBar__globalActions"
          css={styles.globalActions}
          data-test-subj="kibanaProjectHeaderAppMenuGlobalActions"
        >
          <EuiButtonIcon
            aria-label={i18n.translate('core.ui.chrome.appMenu.editButtonAriaLabel', {
              defaultMessage: 'Edit',
            })}
            color="text"
            css={styles.iconButtonSubdued}
            data-test-subj="kibanaProjectHeaderAppMenuEdit"
            display="empty"
            iconType="pencil"
            onClick={noop}
            size="xs"
            type="button"
          />
          <EuiButtonIcon
            aria-label={i18n.translate('core.ui.chrome.appMenu.shareButtonAriaLabel', {
              defaultMessage: 'Share',
            })}
            color="text"
            css={styles.iconButtonSubdued}
            data-test-subj="kibanaProjectHeaderAppMenuShare"
            display="empty"
            iconType="share"
            onClick={noop}
            size="xs"
            type="button"
          />
          <EuiButtonIcon
            aria-label={i18n.translate('core.ui.chrome.appMenu.starButtonAriaLabel', {
              defaultMessage: 'Favorite',
            })}
            color="text"
            css={styles.iconButtonSubdued}
            data-test-subj="kibanaProjectHeaderAppMenuStar"
            display="empty"
            iconType="starEmpty"
            onClick={noop}
            size="xs"
            type="button"
          />
        </div>
      </div>
      <div css={styles.menuSection}>
        {hasAppMenuConfig ? <HeaderAppMenu /> : <HeaderActionMenu />}
      </div>
    </div>
  );
});
