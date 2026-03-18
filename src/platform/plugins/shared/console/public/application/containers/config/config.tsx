/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';

const styles = {
  fullHeightPanel: css`
    height: 100%;
  `,
};

export function Config() {
  return (
    <EuiPanel
      color="plain"
      paddingSize="l"
      hasShadow={false}
      borderRadius="none"
      css={styles.fullHeightPanel}
      data-test-subj="consoleConfigPanel"
    />
  );
}
