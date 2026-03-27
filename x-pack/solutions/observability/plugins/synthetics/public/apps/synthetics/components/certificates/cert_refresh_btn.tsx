/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiShowFor,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import * as labels from './translations';
import { SyntheticsRefreshContext } from '../../contexts';
import type { ClientPluginsStart } from '../../../../plugin';

export const CertRefreshBtn = () => {
  const { refreshApp } = useContext(SyntheticsRefreshContext);
  const {
    services: { chrome },
  } = useKibana<ClientPluginsStart>();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  if (isProjectChrome) {
    return null;
  }

  return (
    <EuiFlexItem
      style={{ alignItems: 'flex-end' }}
      grow={false}
      data-test-subj="certificatesRefreshButton"
    >
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiHideFor sizes={['xs']}>
            <EuiButton
              fill
              iconType="refresh"
              onClick={() => {
                refreshApp();
              }}
              data-test-subj="superDatePickerApplyTimeButton"
            >
              {labels.REFRESH_CERT}
            </EuiButton>
          </EuiHideFor>
          <EuiShowFor sizes={['xs']}>
            <EuiButtonEmpty
              iconType="refresh"
              onClick={() => {
                refreshApp();
              }}
              data-test-subj="superDatePickerApplyTimeButton"
            />
          </EuiShowFor>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
