/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useStreamsFeedbackUrl } from '../../hooks/use_streams_feedback_url';

export function FeedbackButton() {
  const feedbackUrl = useStreamsFeedbackUrl();

  if (!feedbackUrl) return null;

  return (
    <EuiButtonEmpty
      size="s"
      iconType="popout"
      href={feedbackUrl}
      target="_blank"
      rel="noopener"
      iconSide="right"
      aria-label={i18n.translate('xpack.streams.feedbackButtonLabel', {
        defaultMessage: 'Give feedback',
      })}
    >
      {i18n.translate('xpack.streams.feedbackButtonLabel', {
        defaultMessage: 'Give feedback',
      })}
    </EuiButtonEmpty>
  );
}
