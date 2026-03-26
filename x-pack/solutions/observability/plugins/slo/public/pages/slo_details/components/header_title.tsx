/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { SloStateBadge, SloStatusBadge, SloValueBadge } from '../../../components/slo/slo_badges';
import { SloTagsBadge } from '../../../components/slo/slo_badges/slo_tags_badge';
import { SloRemoteBadge } from '../../slos/components/badges/slo_remote_badge';
import { SloInstance } from './instance_selector/slo_instance';

export interface Props {
  slo?: SLOWithSummaryResponse;
  isLoading: boolean;
  /**
   * When false, value and objective / status badges are omitted (e.g. shown in project chrome `headerBadges`).
   */
  showInlineValueStatusBadges?: boolean;
  /**
   * When false, the last-updated line is omitted (e.g. shown in project chrome `headerMetadata`).
   */
  showInlineLastUpdated?: boolean;
}

export function HeaderTitle({
  isLoading,
  slo,
  showInlineValueStatusBadges = true,
  showInlineLastUpdated = true,
}: Props) {
  if (isLoading || !slo) {
    return <EuiSkeletonText lines={2} data-test-subj="loadingTitle" />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        justifyContent="flexStart"
        responsive={false}
        wrap={true}
      >
        {showInlineValueStatusBadges ? (
          <>
            <SloValueBadge slo={slo} isLoading={isLoading} />
            <SloStatusBadge slo={slo} isLoading={isLoading} />
          </>
        ) : null}
        <SloStateBadge slo={slo} />
        <SloRemoteBadge slo={slo} />
        <SloTagsBadge slo={slo} />
      </EuiFlexGroup>
      {slo.description && (
        <EuiFlexItem grow={true}>
          <EuiText className={'eui-textBreakWord'}>
            <EuiMarkdownFormat textSize="xs" color="subdued">
              {slo.description}
            </EuiMarkdownFormat>
          </EuiText>
        </EuiFlexItem>
      )}
      {showInlineLastUpdated ? (
        <EuiFlexItem grow={false}>
          <EuiMarkdownFormat textSize="xs" color="subdued">
            {i18n.translate('xpack.slo.sloDetails.headerTitle.lastUpdatedLabel', {
              defaultMessage: '**Last updated by** {updatedBy} **on** {updatedAt}',
              values: {
                updatedBy: slo.updatedBy ?? NOT_AVAILABLE_LABEL,
                updatedAt: moment(slo.updatedAt).format('ll'),
              },
            })}
          </EuiMarkdownFormat>
        </EuiFlexItem>
      ) : null}
      <SloInstance slo={slo} />
    </EuiFlexGroup>
  );
}

const NOT_AVAILABLE_LABEL = i18n.translate('xpack.slo.sloDetails.headerTitle.notAvailableLabel', {
  defaultMessage: 'n/a',
});

/**
 * Badges for project chrome `AppMenuConfig.headerBadges` (value + objective, SLO status).
 */
export function buildSloDetailsHeaderBadges(
  slo: SLOWithSummaryResponse,
  isLoading: boolean
): React.ReactNode[] {
  return [
    <SloValueBadge key="slo-header-value" slo={slo} isLoading={isLoading} />,
    <SloStatusBadge key="slo-header-status" slo={slo} isLoading={isLoading} />,
  ];
}

/**
 * Metadata row for project chrome `AppMenuConfig.headerMetadata`.
 */
export function buildSloDetailsHeaderMetadata(slo: SLOWithSummaryResponse): React.ReactNode[] {
  return [
    <EuiText size="xs" key="slo-details-last-updated">
      <strong>
        {i18n.translate('xpack.slo.sloDetails.headerTitle.lastUpdatedByStrong', {
          defaultMessage: 'Last updated by',
        })}
      </strong>{' '}
      {slo.updatedBy ?? NOT_AVAILABLE_LABEL}{' '}
      <strong>
        {i18n.translate('xpack.slo.sloDetails.headerTitle.onStrong', {
          defaultMessage: 'on',
        })}
      </strong>{' '}
      {moment(slo.updatedAt).format('ll')}
    </EuiText>,
  ];
}
