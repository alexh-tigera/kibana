/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { IconBadgePopover } from './icon_badge_popover';
import { useServiceIconsModel } from './use_service_icons_model';

interface ServiceIconsHeaderBadgesProps {
  serviceName: string;
  environment: string;
  start: string;
  end: string;
}

/** Service technology icons (agent, container, cloud, etc.) for project chrome `AppMenuConfig.headerBadges`. */
export function ServiceIconsHeaderBadges({
  serviceName,
  environment,
  start,
  end,
}: ServiceIconsHeaderBadgesProps) {
  const {
    popoverItems,
    selectedIconPopover,
    setSelectedIconPopover,
    detailsFetchStatus,
    isLoading,
  } = useServiceIconsModel({ serviceName, environment, start, end });

  if (isLoading) {
    return <EuiLoadingSpinner data-test-subj="apmServiceIconsHeaderBadgesLoading" size="m" />;
  }

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
      {popoverItems.map((item) => {
        if (!item.isVisible) {
          return null;
        }
        return (
          <EuiFlexItem grow={false} data-test-subj={item.key} key={item.key}>
            <IconBadgePopover
              isOpen={selectedIconPopover === item.key}
              icon={item.icon}
              detailsFetchStatus={detailsFetchStatus}
              title={item.title}
              onClick={() => {
                setSelectedIconPopover((prev) => (item.key === prev ? null : item.key));
              }}
              onClose={() => {
                setSelectedIconPopover(null);
              }}
            >
              {item.component}
            </IconBadgePopover>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
