/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { MessageRole, ChatCompletionEventType } from '@kbn/inference-common';
import { createConversationStorage } from './conversation_storage';
import { resolveConnector } from './resolve_connector';
import {
  postMessage,
  createStreamUpdater,
  splitAtParagraph,
  MAX_SLACK_MSG_LEN,
} from './slack_client';
import { markdownToMrkdwn } from './slack_format';

// ---------------------------------------------------------------------------
// Command patterns
// ---------------------------------------------------------------------------

const FORK_RE = /^fork$/i;
const STATUS_RE = /^status$/i;
const RESET_RE = /^(?:reset|new\s+session)$/i;

// ---------------------------------------------------------------------------
// Dedup guard — prevents processing the same Slack event twice
// (Slack retries events that don't receive a timely 200 response)
// ---------------------------------------------------------------------------

const inFlightEvents = new Set<string>();

// ---------------------------------------------------------------------------
// Conversation lookup helpers
// ---------------------------------------------------------------------------

const getSpace = (basePath: string): string => {
  const spaceMatch = basePath.match(/(?:^|\/)s\/([^/]+)/);
  return spaceMatch ? spaceMatch[1] : 'default';
};

const findConversationByOriginRef = async (
  storage: ReturnType<typeof createConversationStorage>,
  originRef: string
): Promise<{ id: string; state: Record<string, unknown> } | null> => {
  const results = await storage.search({
    track_total_hits: false,
    size: 1,
    query: { bool: { filter: [{ term: { 'state.origin_ref': originRef } }] } },
  });

  const hit = results.hits.hits[0];
  if (!hit?._id) return null;

  return {
    id: hit._id,
    state: (hit._source?.state as Record<string, unknown>) ?? {},
  };
};

// ---------------------------------------------------------------------------
// Main event handler
// ---------------------------------------------------------------------------

export interface SlackEvent {
  type: string;
  ts: string;
  channel: string;
  thread_ts?: string;
  text?: string;
  user?: string;
}

export const handleSlackEvent = async ({
  event,
  botToken,
  coreStart,
  inference,
  request,
  logger,
}: {
  event: SlackEvent;
  botToken: string;
  coreStart: CoreStart;
  inference: InferenceServerStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<void> => {
  if (event.type !== 'app_mention' && event.type !== 'message') return;

  const channel = event.channel;
  const threadTs = event.thread_ts ?? event.ts;
  const originRef = `slack:${channel}:${threadTs}`;
  const text = (event.text ?? '').replace(/<@\w+>\s*/g, '').trim();

  // Deduplicate: Slack retries events that don't receive a timely response.
  if (inFlightEvents.has(event.ts)) {
    logger.debug(`Dropping duplicate Slack event ${event.ts}`);
    return;
  }
  inFlightEvents.add(event.ts);
  setTimeout(() => inFlightEvents.delete(event.ts), 10 * 60 * 1000);

  if (!text) {
    await postMessage(botToken, {
      channel,
      thread_ts: threadTs,
      text: 'Mention me with a question.',
    });
    return;
  }

  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const basePath = coreStart.http.basePath.get(request);
  const space = getSpace(basePath);
  const storage = createConversationStorage({ esClient, logger });

  try {
    // --- Command: status ---
    if (STATUS_RE.test(text)) {
      const conv = await findConversationByOriginRef(storage, originRef);
      const lines = ['*Elastic Console — session status*'];
      if (conv) {
        const state = conv.state;
        lines.push(`• Conversation: active`);
        if (state.location) lines.push(`• Location: \`${state.location}\``);
        if (state.located_at) {
          const ageMs = Date.now() - new Date(state.located_at as string).getTime();
          const ageStr =
            ageMs < 60_000
              ? 'just now'
              : ageMs < 3_600_000
              ? `${Math.floor(ageMs / 60_000)}m ago`
              : `${Math.floor(ageMs / 3_600_000)}h ago`;
          lines.push(`• Last activity: ${ageStr}`);
        }
      } else {
        lines.push('• No active session in this thread.');
      }
      await postMessage(botToken, { channel, thread_ts: threadTs, text: lines.join('\n') });
      return;
    }

    // --- Command: reset ---
    if (RESET_RE.test(text)) {
      const conv = await findConversationByOriginRef(storage, originRef);
      if (conv) {
        const fullConv = await storage.get({ id: conv.id });
        if (fullConv.found) {
          await storage.index({
            id: conv.id,
            document: {
              ...fullConv._source,
              conversation_rounds: [],
              state: {
                ...(fullConv._source?.state as Record<string, unknown>),
                location: originRef,
                located_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            },
          });
        }
      }
      await postMessage(botToken, { channel, thread_ts: threadTs, text: 'Session reset.' });
      return;
    }

    // --- Command: fork ---
    if (FORK_RE.test(text)) {
      const conv = await findConversationByOriginRef(storage, originRef);
      if (!conv) {
        await postMessage(botToken, {
          channel,
          thread_ts: threadTs,
          text: 'Cannot fork: no active session in this thread.',
        });
        return;
      }

      const fullConv = await storage.get({ id: conv.id });
      if (!fullConv.found) {
        await postMessage(botToken, {
          channel,
          thread_ts: threadTs,
          text: 'Cannot fork: session not found.',
        });
        return;
      }

      const rounds =
        (fullConv._source?.conversation_rounds as Array<Record<string, unknown>>) ?? [];
      if (rounds.length === 0) {
        await postMessage(botToken, {
          channel,
          thread_ts: threadTs,
          text: 'Cannot fork: no conversation history yet.',
        });
        return;
      }

      const lastRound = rounds[rounds.length - 1];
      const forkContext =
        ((lastRound?.response as Record<string, unknown> | undefined)?.message as string) ?? '';

      // Carry the connector_id from the parent conversation into the fork
      const parentConnectorId = (fullConv._source?.state as Record<string, unknown> | undefined)
        ?.connector_id as string | undefined;

      const forkId = uuidv4();
      const now = new Date().toISOString();

      await storage.index({
        id: forkId,
        document: {
          agent_id: fullConv._source?.agent_id,
          title: `Fork of ${conv.id}`,
          conversation_rounds: [],
          user_id: fullConv._source?.user_id,
          user_name: fullConv._source?.user_name,
          space,
          created_at: now,
          updated_at: now,
          state: {
            fork_context: forkContext,
            origin_ref: originRef,
            origin_location: originRef,
            connector_id: parentConnectorId ?? null,
            location: null,
          },
        },
      });

      await postMessage(botToken, {
        channel,
        thread_ts: threadTs,
        text: [
          `*Session forked*`,
          ``,
          `*Claude Code*`,
          '```',
          `norb fork ${forkId} --agent claude`,
          '```',
          `*Cursor*`,
          '```',
          `norb fork ${forkId} --agent cursor`,
          '```',
        ].join('\n'),
      });
      return;
    }

    // --- Regular question — find or create conversation, call inference ---

    const existingConv = await findConversationByOriginRef(storage, originRef);
    let existingConvId: string | null = null;
    let conversationId: string | undefined;

    if (existingConv) {
      const fullConv = await storage.get({ id: existingConv.id });
      if (fullConv.found) {
        existingConvId = existingConv.id;
        const rounds =
          (fullConv._source?.conversation_rounds as Array<Record<string, unknown>>) ?? [];
        if (rounds.length > 0) {
          conversationId = existingConv.id;
        }
      }
    }

    // Post a placeholder and start streaming
    const streamTs = await postMessage(botToken, {
      channel,
      thread_ts: threadTs,
      text: `_Thinking…_`,
    });

    const updater = createStreamUpdater(botToken, channel, streamTs, threadTs, (err) => {
      logger.warn(`Stream update failed: ${err.message}`);
    });

    const statusLines: string[] = [];
    const responseChunks: string[] = [];
    const STATUS_VISIBLE = 3;

    const buildStreamText = (): string => {
      let msg = '';
      if (statusLines.length) {
        const hidden = statusLines.length - STATUS_VISIBLE;
        const visible = statusLines.slice(-STATUS_VISIBLE);
        if (hidden > 0) msg += `> _…and ${hidden} earlier step${hidden === 1 ? '' : 's'}_\n`;
        msg += visible.map((l) => `> ${l}`).join('\n') + '\n';
      }
      const partial = responseChunks.join('');
      if (partial) {
        if (statusLines.length) msg += '\n';
        const formatted = markdownToMrkdwn(partial);
        const available = MAX_SLACK_MSG_LEN - msg.length;
        msg +=
          formatted.length > available
            ? formatted.slice(0, Math.max(0, available)) + '…'
            : formatted;
      }
      return msg || `_Thinking…_`;
    };

    // Resolve connector: use the one stored in conversation state, or fall back to default
    const stateConnectorId = existingConv?.state?.connector_id as string | undefined;
    const resolvedConnectorId = await resolveConnector(
      inference,
      request,
      stateConnectorId ?? 'default'
    );

    // Call inference plugin directly via Observable
    const inferenceClient = inference.getClient({ request });
    const abortController = new AbortController();

    let responseText = '';

    try {
      await new Promise<void>((resolve, reject) => {
        const events$ = inferenceClient.chatComplete({
          connectorId: resolvedConnectorId,
          conversationId,
          messages: [{ role: MessageRole.User, content: text }],
          stream: true,
          abortSignal: abortController.signal,
        });

        events$.subscribe({
          next: (chunk) => {
            if (chunk.type === ChatCompletionEventType.ChatCompletionChunk) {
              const content = (chunk as { type: string; content: string }).content ?? '';
              if (content) {
                responseChunks.push(content);
                updater.schedule(buildStreamText());
              }
              const toolCalls = (
                chunk as { type: string; tool_calls?: Array<{ function?: { name: string } }> }
              ).tool_calls;
              if (toolCalls?.length) {
                const toolName = toolCalls[0]?.function?.name ?? 'tool';
                statusLines.push(`🛠️ _Calling \`${toolName}\`_`);
                updater.schedule(buildStreamText());
              }
            }
          },
          error: reject,
          complete: resolve,
        });
      });
    } catch (inferenceError) {
      logger.error(`Inference error in Slack handler: ${(inferenceError as Error).message}`);
      await updater.finalize(`⚠️ Error: ${(inferenceError as Error).message}`);
      return;
    }

    responseText = responseChunks.join('');

    const formatted = markdownToMrkdwn(responseText);
    const parts = splitAtParagraph(formatted, MAX_SLACK_MSG_LEN);

    await updater.finalize(parts[0] ?? '_No response_');
    for (const part of parts.slice(1)) {
      await postMessage(botToken, { channel, thread_ts: threadTs, text: part });
    }

    // Persist the conversation round
    const now = new Date().toISOString();
    if (existingConvId) {
      const existing = await storage.get({ id: existingConvId });
      if (existing.found) {
        const rounds = (existing._source?.conversation_rounds as unknown[]) ?? [];
        await storage.index({
          id: existingConvId,
          document: {
            ...existing._source,
            conversation_rounds: [
              ...rounds,
              {
                request: { message: text },
                response: { message: responseText },
              },
            ],
            state: {
              ...(existing._source?.state as Record<string, unknown>),
              location: originRef,
              located_at: now,
            },
            updated_at: now,
          },
        });
      }
    } else {
      await storage.index({
        id: uuidv4(),
        document: {
          agent_id: 'elastic-console-slack',
          title: text.slice(0, 100),
          conversation_rounds: [
            {
              request: { message: text },
              response: { message: responseText },
            },
          ],
          space,
          created_at: now,
          updated_at: now,
          state: {
            origin_ref: originRef,
            origin_location: originRef,
            location: originRef,
            located_at: now,
            connector_id: resolvedConnectorId,
          },
        },
      });
    }
  } catch (error) {
    logger.error(`Slack handler error: ${(error as Error).message}`);
    try {
      await postMessage(botToken, {
        channel,
        thread_ts: threadTs,
        text: `⚠️ Error: ${(error as Error).message}`,
      });
    } catch {
      // best-effort
    }
  }
};
