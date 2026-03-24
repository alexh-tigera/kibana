/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiTitle, useEuiTheme, type UseEuiTheme } from '@elastic/eui';

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { HeaderAppMenu } from '../shared/header_app_menu';
import { HeaderActionMenu } from '../shared/header_action_menu';
import {
  useHasLegacyActionMenu,
  useHasAppMenuConfig,
  useProjectBreadcrumbs,
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
    };

    const leftCluster = {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: '8px',
    };

    const titleSection = {
      flex: '0 1 auto',
      minWidth: 0,
      maxWidth: '100%',
      display: 'flex',
      alignItems: 'center',
    };

    const iconGroup = {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: euiTheme.size.xs,
    };

    const iconButtonSubdued = {
      color: euiTheme.colors.textSubdued,
    };

    const titleEuiTitle = {
      margin: 0,
      minWidth: 0,
      maxWidth: '100%',
      color: euiTheme.colors.textSubdued,
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

    return {
      root,
      leftCluster,
      titleSection,
      iconGroup,
      iconButtonSubdued,
      titleEuiTitle,
      titleEuiTitleReact,
      menuSection,
    };
  }, [euiTheme]);

export const AppMenuBar = React.memo(() => {
  const hasLegacyActionMenu = useHasLegacyActionMenu();
  const { euiTheme } = useEuiTheme();
  const styles = useAppMenuBarStyles(euiTheme);
  const hasAppMenuConfig = useHasAppMenuConfig();
  const breadcrumbs = useProjectBreadcrumbs();
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  const titleContent = lastBreadcrumb?.text;
  const hasTitle = titleContent != null && titleContent !== '' && typeof titleContent !== 'boolean';

  if (!hasLegacyActionMenu && !hasAppMenuConfig) return null;

  const accessibleTitle = getAccessibleTitleFromBreadcrumb(lastBreadcrumb);
  const reactNodeAriaLabel =
    hasTitle && typeof titleContent !== 'string' && accessibleTitle
      ? { 'aria-label': accessibleTitle }
      : {};

  return (
    <div
      className="header__actionMenu"
      data-test-subj="kibanaProjectHeaderActionMenu"
      css={styles.root}
    >
      <div css={styles.leftCluster}>
        <div css={styles.titleSection}>
          {hasTitle ? (
            typeof titleContent === 'string' ? (
              <EuiTitle size="s" css={styles.titleEuiTitle}>
                <span className="eui-textTruncate" title={titleContent}>
                  {titleContent}
                </span>
              </EuiTitle>
            ) : (
              <EuiTitle size="s" css={styles.titleEuiTitleReact} {...reactNodeAriaLabel}>
                <span className="eui-textTruncate">{titleContent}</span>
              </EuiTitle>
            )
          ) : null}
        </div>
        <div css={styles.iconGroup}>
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
