/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { every } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { AppMenuPopoverItem } from '@kbn/core-chrome-app-menu-components';
import type { MutableRefObject } from 'react';

import {
  INDEX_OPEN,
  MAX_DOCUMENTS_FOR_CONVERT_TO_LOOKUP_INDEX,
  MAX_SHARDS_FOR_CONVERT_TO_LOOKUP_INDEX,
} from '../../../../../../common/constants';
import type { Index } from '../../../../../../common';
import type { ModalHostHandles } from '../index_actions_context_menu/modal_host/modal_host';
import { useAppContext } from '../../../../app_context';
import type { IndexActionsContextMenuProps } from '../index_actions_context_menu/index_actions_context_menu';

const isConvertableToLookupIndex = (
  indexName: string,
  indices: Index[],
  isServerless: boolean
): boolean => {
  const selectedIndex = indices.find((idx) => idx.name === indexName);

  if (!selectedIndex || selectedIndex.documents === undefined) {
    return false;
  }

  if (!isServerless && selectedIndex.primary === undefined) {
    return false;
  }

  const isWithinDocumentLimit =
    selectedIndex.documents >= 0 &&
    selectedIndex.documents <= MAX_DOCUMENTS_FOR_CONVERT_TO_LOOKUP_INDEX;

  const hasSinglePrimaryShard =
    Number(selectedIndex.primary) === MAX_SHARDS_FOR_CONVERT_TO_LOOKUP_INDEX;

  if (isServerless) {
    return isWithinDocumentLimit;
  }

  return isWithinDocumentLimit && hasSinglePrimaryShard;
};

export interface UseIndexDetailsManageAppMenuPopoverItemsParams {
  indexNames: string[];
  indices: Index[];
  indexStatusByName: IndexActionsContextMenuProps['indexStatusByName'];
  modalRef: MutableRefObject<ModalHostHandles | null>;
  closeIndices: () => Promise<void>;
  openIndices: () => Promise<void>;
  flushIndices: () => Promise<void>;
  refreshIndices: () => Promise<void>;
  clearCacheIndices: () => Promise<void>;
  deleteIndices: () => Promise<void>;
  performExtensionAction: IndexActionsContextMenuProps['performExtensionAction'];
  reloadIndices: () => void;
}

/**
 * Project chrome: same actions as the Manage index popover, mapped to AppMenu popover items.
 */
export function useIndexDetailsManageAppMenuPopoverItems({
  indexNames,
  indices,
  indexStatusByName,
  modalRef,
  closeIndices,
  openIndices,
  flushIndices,
  refreshIndices,
  clearCacheIndices,
  deleteIndices,
  performExtensionAction,
  reloadIndices,
}: UseIndexDetailsManageAppMenuPopoverItemsParams): AppMenuPopoverItem[] {
  const {
    services: { extensionsService },
    plugins: { reindexService },
    core: { getUrlForApp },
    config: { enableIndexActions, isServerless },
  } = useAppContext();

  return useMemo(() => {
    const allOpen = every(indexNames, (indexName) => {
      return indexStatusByName[indexName] === INDEX_OPEN;
    });

    const selectedIndexCount = indexNames.length;
    const items: AppMenuPopoverItem[] = [];
    let order = 10;

    if (allOpen && enableIndexActions) {
      items.push({
        order: order++,
        id: 'close-index',
        label: i18n.translate('xpack.idxMgmt.indexActionsMenu.closeIndexLabel', {
          defaultMessage: '{selectedIndexCount, plural, one {Close} other {Close indices}}',
          values: { selectedIndexCount },
        }),
        testId: 'closeIndexMenuButton',
        run: () => {
          void closeIndices();
        },
      });
      items.push({
        order: order++,
        id: 'forcemerge-index',
        label: i18n.translate('xpack.idxMgmt.indexActionsMenu.forceMergeIndexLabel', {
          defaultMessage: '{selectedIndexCount, plural, one {Force merge} other {Force merge indices}}',
          values: { selectedIndexCount },
        }),
        testId: 'forcemergeIndexMenuButton',
        run: () => {
          modalRef.current?.openModal({ kind: 'forcemerge' });
        },
      });
      items.push({
        order: order++,
        id: 'refresh-index',
        label: i18n.translate('xpack.idxMgmt.indexActionsMenu.refreshIndexLabel', {
          defaultMessage: '{selectedIndexCount, plural, one {Refresh} other {Refresh indices}}',
          values: { selectedIndexCount },
        }),
        testId: 'refreshIndexMenuButton',
        run: () => {
          void refreshIndices();
        },
      });
      items.push({
        order: order++,
        id: 'clear-cache-index',
        label: i18n.translate('xpack.idxMgmt.indexActionsMenu.clearIndexCacheLabel', {
          defaultMessage:
            '{selectedIndexCount, plural, one {Clear cache} other {Clear indices cache}}',
          values: { selectedIndexCount },
        }),
        testId: 'clearCacheIndexMenuButton',
        run: () => {
          void clearCacheIndices();
        },
      });
      items.push({
        order: order++,
        id: 'flush-index',
        label: i18n.translate('xpack.idxMgmt.indexActionsMenu.flushIndexLabel', {
          defaultMessage: '{selectedIndexCount, plural, one {Flush} other {Flush indices}}',
          values: { selectedIndexCount },
        }),
        testId: 'flushIndexMenuButton',
        run: () => {
          void flushIndices();
        },
      });
    } else if (!allOpen && enableIndexActions) {
      items.push({
        order: order++,
        id: 'open-index',
        label: i18n.translate('xpack.idxMgmt.indexActionsMenu.openIndexLabel', {
          defaultMessage: '{selectedIndexCount, plural, one {Open} other {Open indices}}',
          values: { selectedIndexCount },
        }),
        testId: 'openIndexMenuButton',
        run: () => {
          void openIndices();
        },
      });
    }

    items.push({
      order: order++,
      id: 'delete-index',
      label: i18n.translate('xpack.idxMgmt.indexActionsMenu.deleteIndexLabel', {
        defaultMessage: '{selectedIndexCount, plural, one {Delete} other {Delete indices}}',
        values: { selectedIndexCount },
      }),
      testId: 'deleteIndexMenuButton',
      run: () => {
        modalRef.current?.openModal({ kind: 'delete' });
      },
    });

    extensionsService.actions.forEach((actionExtension, actionIndex) => {
      const actionExtensionDefinition = actionExtension({
        indices,
        reloadIndices,
        getUrlForApp,
      });
      if (actionExtensionDefinition) {
        const { buttonLabel, requestMethod, successMessage, renderConfirmModal } =
          actionExtensionDefinition;
        if (requestMethod) {
          items.push({
            order: order++,
            id: `extension-action-${actionIndex}`,
            label: typeof buttonLabel === 'string' ? buttonLabel : String(buttonLabel),
            run: () => {
              void performExtensionAction(requestMethod, successMessage);
            },
          });
        } else if (renderConfirmModal) {
          items.push({
            order: order++,
            id: `extension-action-modal-${actionIndex}`,
            label: typeof buttonLabel === 'string' ? buttonLabel : String(buttonLabel),
            run: () => {
              modalRef.current?.openModal({ kind: 'extension', actionIndex });
            },
          });
        }
      }
    });

    if (selectedIndexCount === 1) {
      const indexName = indexNames[0];
      const isConvertable = isConvertableToLookupIndex(indexName, indices, isServerless);

      const selectedIndex = indices.find((idx) => idx.name === indexName);

      if (reindexService && selectedIndex?.mode !== 'lookup' && !selectedIndex?.hidden) {
        items.push({
          order: order++,
          id: 'convert-to-lookup',
          label: i18n.translate('xpack.idxMgmt.indexActionsMenu.convertToLookupIndexButtonShort', {
            defaultMessage: 'Convert to lookup',
          }),
          testId: 'convertToLookupIndexButton',
          disableButton: !isConvertable,
          run: () => {
            modalRef.current?.openModal({ kind: 'convertToLookup' });
          },
        });
      }
    }

    return items;
  }, [
    indexNames,
    indices,
    indexStatusByName,
    modalRef,
    closeIndices,
    openIndices,
    flushIndices,
    refreshIndices,
    clearCacheIndices,
    deleteIndices,
    performExtensionAction,
    reloadIndices,
    enableIndexActions,
    extensionsService.actions,
    getUrlForApp,
    isServerless,
    reindexService,
  ]);
}
