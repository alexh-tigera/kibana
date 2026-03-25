/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiBadge, EuiSpacer } from '@elastic/eui';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../utils/kibana_react';
import { getHealthColor } from '../helpers/get_health_color';

const BY_WORD = i18n.translate('xpack.observability.ruleDetails.byWord', {
  defaultMessage: 'by',
});

const ON_WORD = i18n.translate('xpack.observability.ruleDetails.onWord', {
  defaultMessage: 'on',
});

function getRuleDetailMetadataItems(rule: Rule, subdued: boolean): React.ReactNode[] {
  const color = subdued ? ('subdued' as const) : undefined;
  return [
    <EuiText color={color} size="xs" key="rule-detail-last-updated">
      <strong>
        {i18n.translate('xpack.observability.ruleDetails.lastUpdatedMessage', {
          defaultMessage: 'Last updated',
        })}
      </strong>
      &nbsp;
      {BY_WORD} {rule.updatedBy} {ON_WORD}&nbsp;
      {moment(rule.updatedAt).format('ll')}
    </EuiText>,
    <EuiText color={color} size="xs" key="rule-detail-created">
      <strong>
        {i18n.translate('xpack.observability.ruleDetails.createdWord', {
          defaultMessage: 'Created',
        })}
      </strong>
      &nbsp;
      {BY_WORD} {rule.createdBy} {ON_WORD}&nbsp;
      {moment(rule.createdAt).format('ll')}
    </EuiText>,
  ];
}

/**
 * Metadata lines for project chrome app menu `headerMetadata` (two items, wide gutter).
 */
export function buildRuleDetailHeaderMetadata(rule: Rule): React.ReactNode[] {
  return getRuleDetailMetadataItems(rule, false);
}

interface PageTitleContentProps {
  rule: Rule;
  /**
   * When false, "Last updated" / "Created" lines are omitted (e.g. shown in project chrome header metadata).
   */
  showInlineMetadata?: boolean;
}

export function PageTitleContent({ rule, showInlineMetadata = true }: PageTitleContentProps) {
  const {
    triggersActionsUi: { getRuleTagBadge: RuleTagBadge },
  } = useKibana().services;

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <EuiBadge color={getHealthColor(rule.executionStatus.status)}>
            {rule.executionStatus.status.charAt(0).toUpperCase() +
              rule.executionStatus.status.slice(1)}
          </EuiBadge>
        </EuiText>
        {showInlineMetadata ? <EuiSpacer size="m" /> : <EuiSpacer size="s" />}
      </EuiFlexItem>
      {showInlineMetadata ? (
        <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
          {getRuleDetailMetadataItems(rule, true).map((metadataItem, index) => (
            <EuiFlexItem component="span" grow={false} key={index}>
              {metadataItem}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : null}

      {rule.tags.length > 0 && <RuleTagBadge tagsOutPopover tags={rule.tags} />}

      <EuiSpacer size="xs" />
    </>
  );
}
