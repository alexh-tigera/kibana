/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMenuConfig,
  AppMenuHeaderTab,
  AppMenuItemType,
} from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { useMemo, type ReactNode } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useStreamsFeedbackUrl } from '../../../hooks/use_streams_feedback_url';
import { useKibana } from '../../../hooks/use_kibana';

/**
 * Project chrome: badges, tabs, primary Discover, and Feedback overflow for stream management detail.
 * Classic chrome: returns undefined so AppMenu clears the registry.
 */
export function useStreamDetailManagementAppMenu({
  headerBadges,
  headerTabs,
  discoverHref,
  streamName,
  enabled = true,
}: {
  headerBadges: ReactNode[];
  headerTabs: AppMenuHeaderTab[];
  discoverHref: string | undefined;
  streamName: string;
  /**
   * When false, returns undefined so another subtree (e.g. Wrapper) owns `setAppMenu`.
   */
  enabled?: boolean;
}): AppMenuConfig | undefined {
  const {
    core: { chrome },
  } = useKibana();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';
  const feedbackUrl = useStreamsFeedbackUrl();

  return useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome || !enabled) {
      return undefined;
    }

    const overflowOnlyItems: AppMenuItemType[] = [];
    if (feedbackUrl) {
      overflowOnlyItems.push({
        order: 10,
        id: 'stream-detail-feedback',
        label: i18n.translate('xpack.streams.streamsListView.appMenuFeedbackLabel', {
          defaultMessage: 'Feedback',
        }),
        iconType: 'popout',
        href: feedbackUrl,
        target: '_blank',
        testId: 'streamsStreamDetailFeedbackAppMenuItem',
      });
    }

    const config: AppMenuConfig = {
      layout: 'chromeBarV2',
      headerBadges: headerBadges.filter(Boolean),
      headerTabs,
      overflowOnlyItems,
    };

    if (discoverHref) {
      config.primaryActionItem = {
        id: 'stream-detail-discover',
        label: i18n.translate(
          'xpack.streams.entityDetailViewWithoutParams.openInDiscoverBadgeLabel',
          {
            defaultMessage: 'View in Discover',
          }
        ),
        iconType: 'discoverApp',
        href: discoverHref,
        target: '_blank',
        testId: `streamsDiscoverActionButton-${streamName}`,
      };
    }

    return config;
  }, [isProjectChrome, enabled, headerBadges, headerTabs, discoverHref, streamName, feedbackUrl]);
}
