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

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChromeNavControl } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { AppMenuHeaderTab } from '@kbn/core-chrome-app-menu-components';
import { useLayoutUpdate } from '@kbn/core-chrome-layout-components';
import { HeaderAppMenu } from '../shared/header_app_menu';
import { HeaderActionMenu } from '../shared/header_action_menu';
import { HeaderExtension } from '../shared/header_extension';
import { HeaderPageAnnouncer } from '../shared/header_page_announcer';
import {
  useAppMenu,
  useHasAppMenuConfig,
  useProjectBreadcrumbs,
  useNavigateToUrl,
  useBasePath,
  useNavLinks,
  useCurrentAppId,
  useProjectChromeRightControls,
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
const PROJECT_APP_MENU_BAR_HEIGHT_WITH_TABS = 80;

const canNavigateToParent = (crumb: ChromeBreadcrumb | undefined): boolean => {
  if (!crumb) {
    return false;
  }
  return Boolean(crumb.onClick || crumb.href);
};

const useAppMenuBarStyles = (
  euiTheme: UseEuiTheme['euiTheme'],
  hasHeaderTabs: boolean,
  showBackToParent: boolean
) =>
  useMemo(() => {
    const root = {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: 0,
      padding: `${euiTheme.size.s}`,
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
      gap: euiTheme.size.s,
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
      ...(showBackToParent ? {} : { paddingLeft: euiTheme.size.xs }),
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

    const appBarChrome = {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: euiTheme.size.xs,
      marginLeft: 'auto',
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
      appBarChrome,
    };
  }, [euiTheme, hasHeaderTabs, showBackToParent]);

/**
 * Right-side nav controls use mount points; in project mode several plugins (e.g. per-solution AI
 * assistants) still register `projectChrome: 'appBar'` while their `NavControlInitiator` returns
 * `null` off-solution. The mount is truthy so we cannot filter at the data layer — collapse the
 * slot when the subtree has no layout or interactive content after mount.
 */
function appBarSlotHasRenderableContent(host: HTMLElement): boolean {
  const rect = host.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    return true;
  }
  return (
    host.querySelector(
      'button, [role="button"], a[href], input, select, textarea, iframe, canvas, svg, img, [tabindex]:not([tabindex="-1"])'
    ) !== null
  );
}

const AppBarNavControlSlot = React.memo(function AppBarNavControlSlot({
  extension,
}: {
  extension: NonNullable<ChromeNavControl['content'] | ChromeNavControl['mount']>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const schedule = () => {
      setCollapsed(!appBarSlotHasRenderableContent(host));
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(host);
    const mo = new MutationObserver(schedule);
    mo.observe(host, { subtree: true, childList: true, attributes: true });

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(schedule);
    });

    schedule();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mo.disconnect();
    };
  }, [extension]);

  return (
    <div
      ref={hostRef}
      css={{
        display: collapsed ? 'none' : 'flex',
        alignItems: 'center',
      }}
    >
      <HeaderExtension extension={extension} />
    </div>
  );
});

const AppBarNavControl = ({ control }: { control: ChromeNavControl }) => {
  const extension = control.content ?? control.mount;
  if (extension == null) {
    return null;
  }
  return <AppBarNavControlSlot extension={extension} />;
};

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
  const breadcrumbs = useProjectBreadcrumbs();
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  const parentBreadcrumb =
    breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2] : undefined;
  const showBackToParent = Boolean(parentBreadcrumb) && canNavigateToParent(parentBreadcrumb);
  const styles = useAppMenuBarStyles(euiTheme, hasHeaderTabs, showBackToParent);
  const hasAppMenuConfig = useHasAppMenuConfig();
  const appBarControls = useProjectChromeRightControls('appBar');
  const appBarControlsWithExtension = useMemo(
    () =>
      appBarControls.filter((control) => {
        const extension = control.content ?? control.mount;
        return extension != null;
      }),
    [appBarControls]
  );

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
        // Breadcrumb hrefs are often already basePath-prefixed (e.g. /qco/app/...); remove then
        // prepend so we never double the space/project prefix.
        navigateToUrl(basePath.prepend(basePath.remove(href)));
      }
    }
  };

  return (
    <>
      <HeaderPageAnnouncer breadcrumbs={breadcrumbs} />
      <div className="header__actionMenu" data-test-subj="kibanaProjectHeader" css={styles.root}>
        <div css={styles.topRow}>
          <div css={styles.leftCluster}>
            {showBackToParent ? (
              <EuiButtonIcon
                aria-label={backAriaLabel}
                color="text"
                css={styles.iconButtonSubdued}
                data-test-subj="kibanaProjectHeaderAppMenuBack"
                display="empty"
                iconType="sortLeft"
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
          <div css={styles.menuSection} data-test-subj="kibanaProjectHeaderActionMenu">
            {hasAppMenuConfig ? <HeaderAppMenu /> : <HeaderActionMenu />}
          </div>
          {appBarControlsWithExtension.length > 0 ? (
            <div css={styles.appBarChrome} data-test-subj="kibanaProjectHeaderAppBarChrome">
              {appBarControlsWithExtension.map((control, index) => (
                <AppBarNavControl key={index} control={control} />
              ))}
            </div>
          ) : null}
        </div>
        {headerTabs && headerTabs.length > 0 ? (
          <div css={styles.tabsRow}>
            <AppMenuBarHeaderTabs tabs={headerTabs} />
          </div>
        ) : null}
      </div>
    </>
  );
});
