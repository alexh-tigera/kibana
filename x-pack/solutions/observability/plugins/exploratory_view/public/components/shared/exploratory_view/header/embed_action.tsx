/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiPopover, EuiCodeBlock, EuiPopoverTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useSeriesStorage } from '../hooks/use_series_storage';

export function EmbedAction({
  lensAttributes,
  hideTrigger,
  isPopoverOpen: controlledOpen,
  onPopoverOpenChange,
}: {
  lensAttributes: TypedLensByValueInput['attributes'] | null;
  /** When true, the trigger button is visually hidden (e.g. overflow-only in project chrome). */
  hideTrigger?: boolean;
  /** Controlled popover open state (project chrome overflow). */
  isPopoverOpen?: boolean;
  onPopoverOpenChange?: (isOpen: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = onPopoverOpenChange !== undefined;
  const isOpen = isControlled ? (controlledOpen ?? false) : internalOpen;
  const setOpen = isControlled ? onPopoverOpenChange : setInternalOpen;

  const { reportType, allSeries } = useSeriesStorage();

  const button = (
    <EuiButtonEmpty
      data-test-subj="o11yEmbedActionButton"
      size="s"
      style={
        hideTrigger
          ? {
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }
          : undefined
      }
      isDisabled={lensAttributes === null}
      onClick={() => {
        setOpen(!isOpen);
      }}
    >
      {EMBED_LABEL}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={() => setOpen(false)}>
      <EuiPopoverTitle>{EMBED_TITLE_LABEL}</EuiPopoverTitle>
      <EuiCodeBlock
        language="jsx"
        fontSize="m"
        paddingSize="m"
        isCopyable={true}
        style={{ width: 500 }}
      >
        {`const { observability } = useKibana<>().services;

const { ExploratoryViewEmbeddable } = observability;

<ExploratoryViewEmbeddable
        customHeight={'300px'}
        reportType="${reportType}"
        attributes={${JSON.stringify(allSeries, null, 2)}}
 />
        `}
      </EuiCodeBlock>
    </EuiPopover>
  );
}

const EMBED_TITLE_LABEL = i18n.translate('xpack.exploratoryView.expView.heading.embedTitle', {
  defaultMessage: 'Embed Exploratory view (Dev only feature)',
});

const EMBED_LABEL = i18n.translate('xpack.exploratoryView.expView.heading.embed', {
  defaultMessage: 'Embed <></>',
  ignoreTag: true,
});

/** Same label as {@link EMBED_LABEL} for app menu overflow items. */
export const EMBED_OVERFLOW_LABEL = EMBED_LABEL;
