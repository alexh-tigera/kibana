/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postMessage } from './slack_client';

// ---------------------------------------------------------------------------
// Notification service — sends a handoff notification back to the origin.
//
// origin_ref format: '<provider>:<channel>:<thread_ts>'
//   e.g. 'slack:C1234567890:1700000000.123456'
//
// Currently supports Slack. Additional providers (Teams, PagerDuty, etc.)
// can be added by extending the switch below.
// ---------------------------------------------------------------------------

export const sendHandoffNotification = async (
  botToken: string,
  {
    originRef,
    summary,
  }: {
    originRef: string;
    summary?: string;
  }
): Promise<void> => {
  const colonIdx = originRef.indexOf(':');
  if (colonIdx === -1) return;

  const provider = originRef.slice(0, colonIdx);
  const rest = originRef.slice(colonIdx + 1);

  switch (provider) {
    case 'slack': {
      // rest = 'channelId:thread_ts'
      const secondColon = rest.indexOf(':');
      if (secondColon === -1) return;

      const channel = rest.slice(0, secondColon);
      const threadTs = rest.slice(secondColon + 1);

      const lines = ['*Investigation returned*'];
      if (summary) lines.push('', summary);
      lines.push('', '_Continuing in this thread._');

      await postMessage(botToken, {
        channel,
        thread_ts: threadTs,
        text: lines.join('\n'),
      });
      break;
    }
    default:
      // Unknown provider — no-op for now
      break;
  }
};
