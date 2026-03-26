/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';

const STREAMS_FEEDBACK_URL = 'https://ela.st/feedback-streams-ui';

/**
 * Returns the Streams UI feedback URL, or `null` when feedback is disabled.
 */
export function useStreamsFeedbackUrl(): string | null {
  const {
    isServerless,
    dependencies: {
      start: { cloud },
    },
    services: { version },
    core: { notifications },
  } = useKibana();
  const isFeedbackEnabled = notifications?.feedback?.isEnabled() ?? true;

  if (!isFeedbackEnabled) {
    return null;
  }

  const deploymentType = isServerless
    ? 'Serverless'
    : cloud?.isCloudEnabled
    ? 'Cloud'
    : 'Self-Managed';

  const path = window.location.pathname;
  const queryParams = new URLSearchParams({ environment: deploymentType, version, path });
  return `${STREAMS_FEEDBACK_URL}?${queryParams.toString()}`;
}
