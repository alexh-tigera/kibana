/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useStreamsFeedbackUrl } from '../../hooks/use_streams_feedback_url';
import { useKibana } from '../../hooks/use_kibana';

/**
 * Project chrome: primary action and overflow items for the Streams list page.
 * Classic chrome leaves the legacy page header actions unchanged.
 */
export function useStreamsListAppMenu({
  canCreateClassicStream,
  onOpenSettings,
  onOpenClassicStreamCreation,
  sigEventsDiscovery,
  showCreateQueryStream,
  onOpenCreateQueryStream,
}: {
  canCreateClassicStream: boolean;
  onOpenSettings: () => void;
  onOpenClassicStreamCreation: () => void;
  sigEventsDiscovery?: { href: string; onNavigate: () => void };
  showCreateQueryStream?: boolean;
  onOpenCreateQueryStream?: () => void;
}): AppMenuConfig | undefined {
  const {
    core: { chrome },
  } = useKibana();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';
  const feedbackUrl = useStreamsFeedbackUrl();

  return useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const overflowOnlyItems: AppMenuItemType[] = [
      {
        order: 10,
        id: 'streams-list-settings',
        label: i18n.translate('xpack.streams.streamsListView.settingsButtonLabel', {
          defaultMessage: 'Settings',
        }),
        iconType: 'gear',
        run: () => {
          onOpenSettings();
        },
        testId: 'streamsListSettingsAppMenuItem',
      },
    ];

    if (feedbackUrl) {
      overflowOnlyItems.push({
        order: 20,
        id: 'streams-list-feedback',
        label: i18n.translate('xpack.streams.streamsListView.appMenuFeedbackLabel', {
          defaultMessage: 'Feedback',
        }),
        iconType: 'popout',
        href: feedbackUrl,
        target: '_blank',
        testId: 'streamsListFeedbackAppMenuItem',
      });
    }

    if (sigEventsDiscovery) {
      overflowOnlyItems.push({
        order: 30,
        id: 'streams-list-sig-events-discovery',
        label: i18n.translate('xpack.streams.streamsListView.sigEventsDiscoveryButtonLabel', {
          defaultMessage: 'SigEvents Discovery',
        }),
        iconType: 'crosshairs',
        href: sigEventsDiscovery.href,
        run: () => {
          sigEventsDiscovery.onNavigate();
        },
        testId: 'streamsSignificantEventsDiscoveryAppMenuItem',
      });
    }

    if (showCreateQueryStream && onOpenCreateQueryStream) {
      overflowOnlyItems.push({
        order: 40,
        id: 'streams-list-create-query-stream',
        label: i18n.translate('xpack.streams.streamsListView.createQueryStreamButtonLabel', {
          defaultMessage: 'Create Query stream',
        }),
        iconType: 'plusInCircle',
        run: () => {
          onOpenCreateQueryStream();
        },
        testId: 'streamsAppCreateQueryStreamAppMenuItem',
      });
    }

    return {
      layout: 'chromeBarV2',
      primaryActionItem: {
        id: 'streams-list-create-classic',
        label: i18n.translate('xpack.streams.streamsListView.createClassicStreamButtonLabel', {
          defaultMessage: 'Create classic stream',
        }),
        iconType: 'plusInCircle',
        run: () => {
          onOpenClassicStreamCreation();
        },
        disableButton: !canCreateClassicStream,
        testId: 'streamsCreateClassicStreamAppMenuButton',
      },
      overflowOnlyItems,
    };
  }, [
    isProjectChrome,
    canCreateClassicStream,
    onOpenSettings,
    onOpenClassicStreamCreation,
    feedbackUrl,
    sigEventsDiscovery,
    showCreateQueryStream,
    onOpenCreateQueryStream,
  ]);
}
