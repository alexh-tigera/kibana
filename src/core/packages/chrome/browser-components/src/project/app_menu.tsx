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

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { AppMenuHeaderTab } from '@kbn/core-chrome-app-menu-components';
import { useLayoutUpdate } from '@kbn/core-chrome-layout-components';
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

/** Matches project `layoutConfigs.project.applicationTopBarHeight` in grid_layout (single title row). */
const PROJECT_APP_MENU_BAR_HEIGHT_DEFAULT = 48;
/** Room for title row + tabs row when `headerTabs` are set. */
const PROJECT_APP_MENU_BAR_HEIGHT_WITH_TABS = 84;

const canNavigateToParent = (crumb: ChromeBreadcrumb | undefined): boolean => {
  if (!crumb) {
    return false;
  }
  return Boolean(crumb.onClick || crumb.href);
};

const useAppMenuBarStyles = (euiTheme: UseEuiTheme['euiTheme'], hasHeaderTabs: boolean) =>
  useMemo(() => {
    const root = {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: 0,
      padding: `${euiTheme.size.m}`,
      paddingBottom: euiTheme.size.s,
      background: euiTheme.colors.backgroundBasePlain,
      borderBottom: euiTheme.border.thin,
      marginBottom: `-${euiTheme.border.width.thin}`,
      minHeight: 0,
      height: '100%',
      boxSizing: 'border-box' as const,
      '&:hover .appMenuBar__globalActions': {
        opacity: 1,
        pointerEvents: 'auto' as const,
      },
      '&:focus-within .appMenuBar__globalActions': {
        opacity: 1,
        pointerEvents: 'auto' as const,
      },
    };

    const topRow = {
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: euiTheme.size.m,
      flex: hasHeaderTabs ? ('0 0 auto' as const) : ('1 1 auto' as const),
      minHeight: hasHeaderTabs ? undefined : 0,
      minWidth: 0,
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

    const tabsRow = {
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      width: '100%',
      flexShrink: 0,
      minWidth: 0,
    };

    return {
      root,
      topRow,
      leftCluster,
      titleSection,
      tabsRow,
      globalActions,
      iconButtonSubdued,
      titleEuiTitle,
      titleEuiTitleReact,
      menuSection,
    };
  }, [euiTheme, hasHeaderTabs]);

const AppMenuBarHeaderTabs = ({ tabs }: { tabs: AppMenuHeaderTab[] }) => (
  <EuiTabs
    bottomBorder={false}
    data-test-subj="kibanaProjectHeaderAppMenuTabs"
    css={{ marginBottom: 0, width: '100%' }}
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
  const updateLayout = useLayoutUpdate();
  const appMenuConfig = useAppMenu();
  const headerTabs = appMenuConfig?.headerTabs;
  const hasHeaderTabs = Boolean(headerTabs?.length);
  const styles = useAppMenuBarStyles(euiTheme, hasHeaderTabs);
  const hasAppMenuConfig = useHasAppMenuConfig();

  useEffect(() => {
    updateLayout({
      applicationTopBarHeight: hasHeaderTabs
        ? PROJECT_APP_MENU_BAR_HEIGHT_WITH_TABS
        : PROJECT_APP_MENU_BAR_HEIGHT_DEFAULT,
    });
    return () => {
      updateLayout({ applicationTopBarHeight: PROJECT_APP_MENU_BAR_HEIGHT_DEFAULT });
    };
  }, [hasHeaderTabs, updateLayout]);
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
      <div css={styles.topRow}>
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
      {headerTabs && headerTabs.length > 0 ? (
        <div css={styles.tabsRow}>
          <AppMenuBarHeaderTabs tabs={headerTabs} />
        </div>
      ) : null}
    </div>
  );
});
