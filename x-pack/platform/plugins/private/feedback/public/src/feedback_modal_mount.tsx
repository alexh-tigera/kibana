/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { EuiModal } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Subject } from 'rxjs';
import type { FeedbackRegistryEntry } from '@kbn/feedback-registry';
import type { FeedbackFormData } from '../../common';

const LazyFeedbackContainer = lazy(() =>
  import('@kbn/feedback-components').then((m) => ({
    default: m.FeedbackContainer,
  }))
);

interface Props {
  trigger$: Subject<void>;
  getQuestions: (appId: string) => FeedbackRegistryEntry[];
  getAppDetails: () => { title: string; id: string; url: string };
  getCurrentUserEmail: () => Promise<string | undefined>;
  sendFeedback: (data: FeedbackFormData) => Promise<void>;
  showToast: (title: string, type: 'success' | 'error') => void;
}

const modalCss = css`
  overflow-y: auto;
`;

/**
 * Headless modal controller for the feedback form. Renders no visible UI until
 * `trigger$` emits, at which point the EuiModal + FeedbackContainer appears.
 * Intended to be mounted once via a nav control and driven imperatively via the Subject.
 */
export const FeedbackModalMount = ({
  trigger$,
  getQuestions,
  getAppDetails,
  getCurrentUserEmail,
  sendFeedback,
  showToast,
}: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const subscription = trigger$.subscribe(() => setIsModalOpen(true));
    return () => subscription.unsubscribe();
  }, [trigger$]);

  if (!isModalOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <EuiModal
        onClose={() => setIsModalOpen(false)}
        aria-label={i18n.translate('feedback.modal.ariaLabel', {
          defaultMessage: 'Feedback form',
        })}
        css={modalCss}
      >
        <LazyFeedbackContainer
          getAppDetails={getAppDetails}
          getQuestions={getQuestions}
          getCurrentUserEmail={getCurrentUserEmail}
          sendFeedback={sendFeedback}
          showToast={showToast}
          hideFeedbackContainer={() => setIsModalOpen(false)}
        />
      </EuiModal>
    </Suspense>
  );
};
