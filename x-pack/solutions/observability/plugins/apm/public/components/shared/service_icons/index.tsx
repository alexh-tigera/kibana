/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { IconPopover } from './icon_popover';
import { useServiceIconsModel } from './use_service_icons_model';

export { getContainerIcon } from './get_container_icon';
export type {
  ServiceIconsPopoverItem,
  ServiceIconsPopoverKey,
} from './service_icons_popover_types';
export { ServiceIconsHeaderBadges } from './service_icons_header_badges';

interface Props {
  serviceName: string;
  environment: string;
  start: string;
  end: string;
}

export function ServiceIcons({ start, end, serviceName, environment }: Props) {
  const {
    popoverItems,
    selectedIconPopover,
    setSelectedIconPopover,
    detailsFetchStatus,
    isLoading,
  } = useServiceIconsModel({ serviceName, environment, start, end });

  if (isLoading) {
    return <EuiLoadingSpinner data-test-subj="loading" />;
  }

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      {popoverItems.map((item) => {
        if (item.isVisible) {
          return (
            <EuiFlexItem grow={false} data-test-subj={item.key} key={item.key}>
              <IconPopover
                isOpen={selectedIconPopover === item.key}
                icon={item.icon}
                detailsFetchStatus={detailsFetchStatus}
                title={item.title}
                onClick={() => {
                  setSelectedIconPopover((prevSelectedIconPopover) =>
                    item.key === prevSelectedIconPopover ? null : item.key
                  );
                }}
                onClose={() => {
                  setSelectedIconPopover(null);
                }}
              >
                {item.component}
              </IconPopover>
            </EuiFlexItem>
          );
        }
      })}
    </EuiFlexGroup>
  );
}
