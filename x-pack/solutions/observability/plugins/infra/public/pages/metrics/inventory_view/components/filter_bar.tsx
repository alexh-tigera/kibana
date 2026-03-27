/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { type ReactNode } from 'react';

import { WaffleTimeControls } from './waffle/waffle_time_controls';
import { SearchBar } from './search_bar';

interface FilterBarProps {
  interval: string;
  /** Rendered as the first item on the row, before the search bar (e.g. project chrome saved views). */
  leadingContent?: ReactNode;
}

export const FilterBar = ({ interval, leadingContent }: FilterBarProps) => (
  <EuiFlexGroup alignItems="center" gutterSize="m" style={{ flexGrow: 0 }}>
    {leadingContent ? <EuiFlexItem grow={false}>{leadingContent}</EuiFlexItem> : null}
    <EuiFlexItem grow>
      <SearchBar />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <WaffleTimeControls interval={interval} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
