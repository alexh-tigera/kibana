/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the "Elastic License
 * 2.0".
 */

import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import useObservable from 'react-use/lib/useObservable';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useKibana } from '../hooks/use_kibana';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { EmbedAction, EMBED_OVERFLOW_LABEL } from './embed_action';
import { AddToCaseAction } from './add_to_case_action';
import { REFRESH_LABEL } from './refresh_button';

const OPEN_IN_LENS_LABEL = i18n.translate('xpack.exploratoryView.expView.heading.openInLens', {
  defaultMessage: 'Open in Lens',
});

const SAVE_LABEL = i18n.translate('xpack.exploratoryView.expView.heading.saveLensVisualization', {
  defaultMessage: 'Save',
});

const ADD_TO_CASE_LABEL = i18n.translate('xpack.exploratoryView.expView.heading.addToCase', {
  defaultMessage: 'Add to case',
});

export function ExploratoryViewProjectAppMenu({
  timeRange,
  lensAttributes,
}: {
  timeRange?: { from: string; to: string };
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}) {
  const {
    services: { lens, chrome, isDev },
  } = useKibana();

  const { chartTimeRangeContext, setLastRefresh } = useSeriesStorage();
  const { lastUpdated, from, to } = chartTimeRangeContext || {};

  const [refreshTick, setRefreshTick] = useState(() => Date.now());
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [embedPopoverOpen, setEmbedPopoverOpen] = useState(false);
  const [addToCaseOpenSignal, setAddToCaseOpenSignal] = useState(0);

  const LensSaveModalComponent = lens.SaveModalComponent;

  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTick(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setRefreshTick(Date.now());
  }, [lastUpdated]);

  const headerMetadata = useMemo(() => {
    if (!lastUpdated) {
      return [];
    }

    const dateFormat = 'lll';
    const fromFormatted = from !== undefined ? moment(from).format(dateFormat) : '';
    const toFormatted = to !== undefined ? moment(to).format(dateFormat) : '';
    const created = moment(lastUpdated).format(dateFormat);

    const meta: React.ReactNode[] = [
      <EuiText size="xs" key="last-updated">
        <FormattedMessage
          id="xpack.exploratoryView.expView.projectChrome.lastUpdatedMeta"
          defaultMessage="{strong} {relative}"
          values={{
            strong: <strong>Last updated</strong>,
            relative: moment(lastUpdated).from(refreshTick),
          }}
        />
      </EuiText>,
      <EuiText size="xs" key="chart-created">
        <FormattedMessage
          id="xpack.exploratoryView.expView.projectChrome.chartCreatedMeta"
          defaultMessage="{strong} {created}"
          values={{
            strong: <strong>Chart created</strong>,
            created,
          }}
        />
      </EuiText>,
    ];

    if (to !== undefined && from !== undefined) {
      meta.push(
        <EuiText size="xs" key="displaying-from">
          <FormattedMessage
            id="xpack.exploratoryView.expView.projectChrome.displayingFromMeta"
            defaultMessage="{strong} {from} → {to}"
            values={{
              strong: <strong>Displaying from</strong>,
              from: fromFormatted,
              to: toFormatted,
            }}
          />
        </EuiText>
      );
    }

    return meta;
  }, [lastUpdated, from, to, refreshTick]);

  const config = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const lensDisabled = !lens.canUseEditor() || lensAttributes === null;

    const overflowOnlyItems: AppMenuItemType[] = [];

    if (isDev) {
      overflowOnlyItems.push({
        order: 1,
        id: 'exploratory-view-embed',
        label: EMBED_OVERFLOW_LABEL,
        iconType: 'code',
        testId: 'o11yEmbedActionButton',
        disableButton: () => lensAttributes === null,
        run: () => {
          setEmbedPopoverOpen(true);
        },
      });
    }

    if (timeRange) {
      overflowOnlyItems.push({
        order: 2,
        id: 'exploratory-view-add-to-case',
        label: ADD_TO_CASE_LABEL,
        iconType: 'plusInCircle',
        testId: 'o11yAddToCaseActionAddToCaseButton',
        disableButton: () => lensAttributes === null,
        run: () => {
          setAddToCaseOpenSignal((n) => n + 1);
        },
      });
    }

    return {
      layout: 'chromeBarV2',
      headerMetadata,
      primaryActionItem: {
        id: 'exploratory-view-save',
        label: SAVE_LABEL,
        iconType: 'save',
        testId: 'o11yExpViewActionMenuContentSaveButton',
        disableButton: () => lensDisabled,
        run: () => {
          if (lensAttributes) {
            setIsSaveOpen(true);
          }
        },
      },
      secondaryActionItems: [
        {
          id: 'exploratory-view-refresh',
          label: REFRESH_LABEL,
          iconType: 'refresh',
          testId: 'o11yRefreshButtonButton',
          run: () => {
            setLastRefresh(Date.now());
          },
        },
        {
          id: 'exploratory-view-open-lens',
          label: OPEN_IN_LENS_LABEL,
          iconType: 'lensApp',
          testId: 'o11yExpViewActionMenuContentOpenInLensButton',
          disableButton: () => lensDisabled,
          run: () => {
            if (lensAttributes) {
              lens.navigateToPrefilledEditor(
                {
                  id: '',
                  time_range: timeRange,
                  attributes: lensAttributes,
                },
                {
                  openInNewTab: true,
                }
              );
            }
          },
        },
      ],
      overflowOnlyItems,
    };
  }, [
    headerMetadata,
    isProjectChrome,
    isDev,
    lens,
    lensAttributes,
    setLastRefresh,
    timeRange,
  ]);

  if (!isProjectChrome || !config) {
    return null;
  }

  return (
    <>
      <AppMenu config={config} setAppMenu={chrome.setAppMenu} />
      {isSaveOpen && lensAttributes && (
        <LensSaveModalComponent
          initialInput={{ attributes: lensAttributes }}
          onClose={() => setIsSaveOpen(false)}
          onSave={() => {}}
        />
      )}
      {isDev && (
        <EmbedAction
          lensAttributes={lensAttributes}
          hideTrigger={true}
          isPopoverOpen={embedPopoverOpen}
          onPopoverOpenChange={setEmbedPopoverOpen}
        />
      )}
      {timeRange ? (
        <AddToCaseAction
          lensAttributes={lensAttributes}
          timeRange={timeRange}
          hideTrigger={true}
          openSignal={addToCaseOpenSignal}
        />
      ) : null}
    </>
  );
}
