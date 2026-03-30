/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSkeletonText,
} from '@elastic/eui';
import React from 'react';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import type { ServiceIconsPopoverItem } from './service_icons_popover_types';

interface IconBadgePopoverProps {
  title: string;
  children: React.ReactChild;
  onClick: () => void;
  onClose: () => void;
  detailsFetchStatus: FETCH_STATUS;
  isOpen: boolean;
  icon: ServiceIconsPopoverItem['icon'];
}

export function IconBadgePopover({
  icon,
  title,
  children,
  onClick,
  onClose,
  detailsFetchStatus,
  isOpen,
}: IconBadgePopoverProps) {
  if (!icon.type) {
    return null;
  }

  const isLoading = detailsFetchStatus === FETCH_STATUS.LOADING;

  return (
    <EuiPopover
      anchorPosition="downLeft"
      ownFocus={false}
      button={
        <EuiBadge
          color="hollow"
          iconType={icon.type}
          iconSide="left"
          onClick={onClick}
          onClickAriaLabel={title}
          data-test-subj={`apmServiceIconBadge_${title}`}
        />
      }
      isOpen={isOpen}
      closePopover={onClose}
      onBlur={onClose}
      aria-label={title}
    >
      <EuiPopoverTitle>
        <EuiFlexGroup
          alignItems="center"
          component="span"
          css={{ width: '100%' }}
          gutterSize="s"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem grow>{title}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon
              aria-hidden
              size={icon.size ?? 'l'}
              type={icon.type}
              data-test-subj={`apmServiceIconPopoverTitleIcon_${title}`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <div style={{ minWidth: 300 }}>
        {isLoading ? <EuiSkeletonText data-test-subj="loading-content" /> : children}
      </div>
    </EuiPopover>
  );
}
