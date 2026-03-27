/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FilterGroup } from './filter_group';
import { SearchField } from '../search_field';
import { RefreshButton } from '../../../common/components/refresh_button';
import type { SyntheticsMonitorFilterChangeHandler } from '../../../../utils/filters/filter_fields';

export const ListFilters = function ({
  handleFilterChange,
}: {
  handleFilterChange: SyntheticsMonitorFilterChangeHandler;
}) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap={true} responsive={false}>
      <EuiFlexItem
        css={{
          minWidth: 0,
          flex: '1 1 0%',
        }}
      >
        <EuiFlexGroup gutterSize="s" wrap={true} alignItems="center">
          <EuiFlexItem css={{ minWidth: 0 }}>
            <SearchField />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FilterGroup handleFilterChange={handleFilterChange} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ flexShrink: 0 }}>
        <RefreshButton />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
