/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import { EuiFlexGroup, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { ALERT_DURATION, TIMESTAMP } from '@kbn/rule-data-utils';
import { asDuration } from '../../../../common/utils/formatters';
import type { TopAlert } from '../../../typings/alerts';

/**
 * Metadata items for project chrome `AppMenuConfig.headerMetadata` (Triggered, Duration, Last status update).
 */
export function useAlertDetailsHeaderMetadataItems(
  alert: TopAlert | null
): React.ReactNode[] | undefined {
  const dateFormat = useUiSetting<string>('dateFormat');
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    if (!alert) {
      return undefined;
    }

    const semiBold = css`
      font-weight: ${euiTheme.font.weight.semiBold};
    `;

    return [
      <EuiFlexGroup
        key="alert-details-metadata-triggered"
        gutterSize="xs"
        responsive={false}
        wrap={false}
        css={{ minWidth: 100 }}
      >
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.observability.pages.alertDetails.pageTitle.triggered"
            defaultMessage="Triggered:"
          />
        </EuiText>
        <EuiToolTip content={moment(Number(alert.start)).format(dateFormat)}>
          <EuiText tabIndex={0} css={semiBold} size="xs">
            {moment(Number(alert.start)).locale(i18n.getLocale()).fromNow()}
          </EuiText>
        </EuiToolTip>
      </EuiFlexGroup>,
      <EuiFlexGroup
        key="alert-details-metadata-duration"
        gutterSize="xs"
        responsive={false}
        wrap={false}
      >
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.observability.pages.alertDetails.pageTitle.duration"
            defaultMessage="Duration:"
          />
        </EuiText>
        <EuiText css={semiBold} size="xs">
          {asDuration(Number(alert.fields[ALERT_DURATION]))}
        </EuiText>
      </EuiFlexGroup>,
      <EuiFlexGroup
        key="alert-details-metadata-last-update"
        gutterSize="xs"
        responsive={false}
        wrap={false}
        css={{ minWidth: 240 }}
      >
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.observability.pages.alertDetails.pageTitle.lastStatusUpdate"
            defaultMessage="Last status update:"
          />
        </EuiText>
        <EuiToolTip content={moment(alert.fields[TIMESTAMP]).format(dateFormat)}>
          <EuiText tabIndex={0} css={semiBold} size="xs">
            {moment(alert.fields[TIMESTAMP]?.toString()).locale(i18n.getLocale()).fromNow()}
          </EuiText>
        </EuiToolTip>
      </EuiFlexGroup>,
    ];
  }, [alert, dateFormat, euiTheme.font.weight.semiBold]);
}
