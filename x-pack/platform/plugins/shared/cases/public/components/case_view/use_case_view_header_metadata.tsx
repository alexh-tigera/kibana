/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import moment from 'moment-timezone';
import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { CaseMetricsFeature } from '../../../common/types/api';
import type { CaseUI } from '../../../common/ui/types';
import { useDateFormat, useTimeZone } from '../../common/lib/kibana';
import { useCasesFeatures } from '../../common/use_cases_features';
import { getStatusDate, getStatusTitle } from '../case_action_bar/helpers';
import { getMaybeDate } from '../formatted_date/maybe_date';

/**
 * Mirrors {@link FormattedRelativePreferenceDate} for the common cases (>1h preference format,
 * ≤1h relative) but returns a plain string so nodes can be passed to project chrome `headerMetadata`
 * (rendered outside plugin React context).
 */
function useCaseOpenedDisplayString(raw?: string | number | null, stripMs = false): string {
  const systemDateFormat = useDateFormat();
  const timeZone = useTimeZone();

  return useMemo(() => {
    if (raw == null) {
      return '';
    }
    const maybeDate = getMaybeDate(raw);
    if (!maybeDate.isValid()) {
      return '';
    }
    const date = maybeDate.toDate();
    if (moment(date).add(1, 'hours').isBefore(new Date())) {
      const strippedDateFormat =
        systemDateFormat && stripMs ? systemDateFormat.replace(/\.?SSS/, '') : systemDateFormat;
      return moment.tz(date, timeZone).format(strippedDateFormat ?? 'LLL');
    }
    return moment(date).fromNow();
  }, [raw, stripMs, systemDateFormat, timeZone]);
}

/**
 * Metadata nodes for `AppMenuConfig.headerMetadata` in project chrome. Uses only plain strings
 * inside `EuiText` so hooks are not run from `AppMenuBar` (which sits outside `CasesProvider` /
 * KibanaReactContext).
 */
export function useCaseViewHeaderMetadata(caseData: CaseUI): ReactNode[] | undefined {
  const { metricsFeatures } = useCasesFeatures();
  const statusDate = getStatusDate(caseData);
  const includeOpenedDate =
    !metricsFeatures.includes(CaseMetricsFeature.LIFESPAN) && statusDate != null;
  const openedDisplay = useCaseOpenedDisplayString(includeOpenedDate ? statusDate : null);
  const statusTitle = getStatusTitle(caseData.status);

  return useMemo(() => {
    const items: ReactNode[] = [];

    if (typeof caseData.incrementalId === 'number') {
      items.push(
        <EuiText
          color="subdued"
          size="xs"
          key="case-incremental-id"
          data-test-subj="cases-case-view-header-meta-id"
        >
          {'#'}
          {caseData.incrementalId}
        </EuiText>
      );
    }

    if (includeOpenedDate && openedDisplay !== '') {
      items.push(
        <EuiText
          size="xs"
          key="case-status-date"
          data-test-subj="cases-case-view-header-meta-opened"
        >
          <strong>{statusTitle}</strong> {openedDisplay}
        </EuiText>
      );
    }

    return items.length > 0 ? items : undefined;
  }, [caseData.incrementalId, includeOpenedDate, openedDisplay, statusTitle]);
}
