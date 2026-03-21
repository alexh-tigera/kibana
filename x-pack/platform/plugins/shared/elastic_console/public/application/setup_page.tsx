/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiCopy,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

const LOCAL_AGENT_URL = 'http://localhost:14642';

interface SetupResponse {
  elasticsearchUrl: string;
  kibanaUrl: string;
  apiKeyEncoded: string;
}

type SlackConnectionStatus = 'connected' | 'disconnected' | 'not_connected';

interface SlackStatusResponse {
  status: SlackConnectionStatus;
  connected_at?: string;
}

export const SetupPage: React.FC = () => {
  const { services } = useKibana<CoreStart>();
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoDeliveryStatus, setAutoDeliveryStatus] = useState<'idle' | 'success' | 'failed'>(
    'idle'
  );
  const [slackStatus, setSlackStatus] = useState<SlackStatusResponse | null>(null);
  const [slackStatusLoading, setSlackStatusLoading] = useState(true);

  // Slack user linking state
  const [slackUserId, setSlackUserId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('link_slack') ?? '';
  });
  const [linkStatus, setLinkStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    services.http
      .get<SlackStatusResponse>('/internal/elastic_console/slack/status')
      .then(setSlackStatus)
      .catch(() => setSlackStatus(null))
      .finally(() => setSlackStatusLoading(false));
  }, [services.http]);

  const handleSetup = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAutoDeliveryStatus('idle');

    try {
      const data = await services.http.post<SetupResponse>('/internal/elastic_console/setup');
      setSetupData(data);

      // Attempt auto-delivery to local agent
      try {
        await fetch(`${LOCAL_AGENT_URL}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            elasticsearch_url: data.elasticsearchUrl,
            kibana_url: data.kibanaUrl,
            api_key: data.apiKeyEncoded,
            provider: {
              kibana: {
                name: 'Kibana LLM Gateway',
                id: 'kibana',
                npm: '@ai-sdk/openai-compatible',
                env: [],
                models: {
                  default: {
                    id: 'default',
                    name: 'Default Connector',
                    attachment: false,
                    reasoning: false,
                    temperature: true,
                    tool_call: true,
                    release_date: '2025-01-01',
                    cost: { input: 0, output: 0 },
                    limit: { context: 128000, output: 8192 },
                  },
                },
                options: {
                  baseURL: `${data.kibanaUrl}/internal/elastic_console/v1`,
                  apiKey: 'ignored',
                  headers: {
                    Authorization: `ApiKey ${data.apiKeyEncoded}`,
                    'x-elastic-internal-origin': 'kibana',
                    'kbn-xsrf': 'true',
                  },
                },
              },
            },
            model: 'kibana/default',
          }),
        });
        setAutoDeliveryStatus('success');
      } catch {
        setAutoDeliveryStatus('failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create setup credentials');
    } finally {
      setIsLoading(false);
    }
  }, [services.http]);

  const handleLinkSlack = useCallback(async () => {
    if (!slackUserId.trim()) return;
    setLinkStatus('idle');
    setLinkError(null);
    try {
      await services.http.post('/internal/elastic_console/slack/link_user', {
        body: JSON.stringify({ slack_user_id: slackUserId.trim() }),
      });
      setLinkStatus('success');
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to link account');
      setLinkStatus('error');
    }
  }, [services.http, slackUserId]);

  const slackStatusBadge = slackStatusLoading ? (
    <EuiLoadingSpinner size="s" />
  ) : slackStatus?.status === 'connected' ? (
    <EuiBadge color="success">Slack: Connected</EuiBadge>
  ) : slackStatus?.status === 'disconnected' ? (
    <EuiBadge color="danger">Slack: Disconnected</EuiBadge>
  ) : null;

  const handleConnectSlack = useCallback(async () => {
    const { url } = await services.http.get<{ url: string }>(
      '/internal/elastic_console/slack/connect'
    );
    window.location.href = url;
  }, [services.http]);

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle="Elastic Console Setup"
        rightSideItems={slackStatusBadge ? [slackStatusBadge] : []}
      />
      <EuiPageTemplate.Section>

        {/* ── CLI / MCP Setup ── */}
        <EuiTitle size="s">
          <h2>CLI / MCP Setup</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            Generate credentials for the local <code>elastic-console</code> agent or any
            MCP-compatible tool.
          </p>
        </EuiText>
        <EuiSpacer />

        <EuiButton fill onClick={handleSetup} isLoading={isLoading}>
          CLI / MCP Setup
        </EuiButton>

        <EuiSpacer />

        {error && (
          <>
            <EuiCallOut announceOnMount title="Setup failed" color="danger" iconType="error">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {autoDeliveryStatus === 'success' && (
          <>
            <EuiCallOut
              announceOnMount
              title="Credentials delivered to local agent"
              color="success"
              iconType="check"
            >
              <p>
                The credentials were automatically sent to the local Elastic Console agent at{' '}
                {LOCAL_AGENT_URL}.
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {autoDeliveryStatus === 'failed' && setupData && (
          <>
            <EuiCallOut
              announceOnMount
              title="Could not reach local agent"
              color="warning"
              iconType="warning"
            >
              <p>No local agent found at {LOCAL_AGENT_URL}. Copy the credentials below manually.</p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {setupData && (
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow label="Kibana URL" fullWidth>
                <EuiFieldText value={setupData.kibanaUrl} readOnly fullWidth />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="Elasticsearch URL" fullWidth>
                <EuiFieldText value={setupData.elasticsearchUrl} readOnly fullWidth />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="API Key (Base64)" fullWidth>
                <EuiCodeBlock language="text" paddingSize="s" isCopyable>
                  {setupData.apiKeyEncoded}
                </EuiCodeBlock>
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy
                textToCopy={JSON.stringify(
                  {
                    kibanaUrl: setupData.kibanaUrl,
                    elasticsearchUrl: setupData.elasticsearchUrl,
                    apiKey: setupData.apiKeyEncoded,
                  },
                  null,
                  2
                )}
              >
                {(copy) => (
                  <EuiButton onClick={copy} iconType="copy">
                    Copy all as JSON
                  </EuiButton>
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        <EuiHorizontalRule />

        {/* ── Connect Slack ── */}
        <EuiTitle size="s">
          <h2>Connect Slack</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>Authorise the Slack bot so your team can interact with the AI assistant from Slack.</p>
        </EuiText>
        <EuiSpacer />

        {slackStatusLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : slackStatus?.status === 'connected' ? (
          <>
            <EuiCallOut title="Slack is connected" color="success" iconType="check">
              {slackStatus.connected_at && (
                <p>Connected since {new Date(slackStatus.connected_at).toLocaleString()}.</p>
              )}
            </EuiCallOut>
            <EuiSpacer size="s" />
            <EuiButtonEmpty iconType="logoSlack" size="s" onClick={handleConnectSlack}>
              Reconnect
            </EuiButtonEmpty>
          </>
        ) : slackStatus?.status === 'disconnected' ? (
          <>
            <EuiCallOut
              title="Slack connection lost — API key revoked or expired"
              color="danger"
              iconType="warning"
            >
              <p>
                Slack events can no longer be forwarded to Kibana. Reconnect to generate a new API
                key.
                {slackStatus.connected_at && (
                  <> Last connected: {new Date(slackStatus.connected_at).toLocaleString()}.</>
                )}
              </p>
            </EuiCallOut>
            <EuiSpacer />
            <EuiButton iconType="logoSlack" color="danger" onClick={handleConnectSlack}>
              Reconnect Slack
            </EuiButton>
          </>
        ) : (
          <EuiButton iconType="logoSlack" fill onClick={handleConnectSlack}>
            Connect Slack
          </EuiButton>
        )}

        <EuiHorizontalRule />

        {/* ── Link Slack Account ── */}
        <EuiTitle size="s">
          <h2>Link Slack Account</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            Link your Slack user ID to this Kibana account so conversations started in Slack appear
            in Agent Builder. Your Slack user ID is shown in the bot&apos;s first message when you
            chat with it.
          </p>
        </EuiText>
        <EuiSpacer />

        {linkStatus === 'success' && (
          <>
            <EuiCallOut title="Slack account linked" color="success" iconType="check">
              <p>
                Slack user <strong>{slackUserId}</strong> is now linked to your Kibana account.
                Future conversations from Slack will appear in Agent Builder.
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        {linkStatus === 'error' && (
          <>
            <EuiCallOut title="Link failed" color="danger" iconType="error">
              <p>{linkError}</p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <EuiFlexGroup alignItems="flexEnd" gutterSize="m">
          <EuiFlexItem>
            <EuiFormRow label="Slack User ID" fullWidth>
              <EuiFieldText
                placeholder="e.g. U0123456789"
                value={slackUserId}
                onChange={(e) => setSlackUserId(e.target.value)}
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButton
                onClick={handleLinkSlack}
                isDisabled={!slackUserId.trim() || linkStatus === 'success'}
              >
                Link account
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
