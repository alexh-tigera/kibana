/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import type { Index } from '../../../../../../common';
import { IndexActionsContextMenu } from '../index_actions_context_menu/index_actions_context_menu';
import { useManageIndexButtonHandlers } from './use_manage_index_button_handlers';

interface Props {
  index: Index;
  reloadIndexDetails: () => Promise<void>;
  navigateToIndicesList: () => void;
  onIndexRefresh?: () => Promise<void> | void;
  fill?: boolean;
}

/**
 * This component is a wrapper for the underlying "index actions context menu" that is currently used
 * in the indices list and works with redux. That is why all request helpers from the services are expecting
 * an array of indices, for example "deleteIndices(indexNames)".
 *
 */
export const ManageIndexButton: FunctionComponent<Props> = ({
  index,
  reloadIndexDetails,
  navigateToIndicesList,
  onIndexRefresh,
  fill = false,
}) => {
  const {
    indexNames,
    indices,
    indexStatusByName,
    isLoading,
    reloadIndices,
    closeIndices,
    openIndices,
    flushIndices,
    refreshIndices,
    clearCacheIndices,
    forcemergeIndices,
    deleteIndices,
    performExtensionAction,
  } = useManageIndexButtonHandlers({
    index,
    reloadIndexDetails,
    navigateToIndicesList,
    onIndexRefresh,
  });

  return (
    <IndexActionsContextMenu
      indexNames={indexNames}
      indices={indices}
      indexStatusByName={indexStatusByName}
      fill={fill}
      isLoading={isLoading}
      closeIndices={closeIndices}
      openIndices={openIndices}
      flushIndices={flushIndices}
      refreshIndices={refreshIndices}
      clearCacheIndices={clearCacheIndices}
      forcemergeIndices={forcemergeIndices}
      deleteIndices={deleteIndices}
      performExtensionAction={performExtensionAction}
      reloadIndices={reloadIndices}
    />
  );
};
