/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { MAX_TITLE_LENGTH } from '../../../../common/constants';
import { CANCEL, MAX_LENGTH_ERROR, TITLE_REQUIRED } from '../../../common/translations';
import * as i18n from '../translations';

export interface RenameCaseModalProps {
  currentTitle: string;
  isVisible: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (title: string) => void;
}

const RenameCaseModalComponent: React.FC<RenameCaseModalProps> = ({
  currentTitle,
  isVisible,
  isSaving,
  onCancel,
  onSave,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [value, setValue] = useState(currentTitle);
  const [fieldError, setFieldError] = useState<string | undefined>();

  useEffect(() => {
    if (isVisible) {
      setValue(currentTitle);
      setFieldError(undefined);
    }
  }, [isVisible, currentTitle]);

  const validateAndSave = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed.length) {
      setFieldError(TITLE_REQUIRED);
      return;
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
      setFieldError(MAX_LENGTH_ERROR('title', MAX_TITLE_LENGTH));
      return;
    }
    setFieldError(undefined);
    if (trimmed === currentTitle) {
      onCancel();
      return;
    }
    onSave(trimmed);
  }, [value, currentTitle, onCancel, onSave]);

  if (!isVisible) {
    return null;
  }

  return (
    <EuiModal data-test-subj="case-rename-modal" onClose={onCancel} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{i18n.RENAME_CASE_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={i18n.RENAME_CASE_FIELD_LABEL}
          error={fieldError}
          isInvalid={!!fieldError}
        >
          <EuiFieldText
            data-test-subj="case-rename-modal-input"
            value={value}
            disabled={isSaving}
            onChange={(e) => {
              setValue(e.target.value);
              setFieldError(undefined);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                validateAndSave();
              }
            }}
            maxLength={MAX_TITLE_LENGTH + 50}
            autoFocus
            fullWidth
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="case-rename-modal-cancel"
          onClick={onCancel}
          disabled={isSaving}
        >
          {CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="case-rename-modal-save"
          onClick={validateAndSave}
          isLoading={isSaving}
          fill
        >
          {i18n.RENAME_CASE_MODAL_SAVE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

RenameCaseModalComponent.displayName = 'RenameCaseModal';

export const RenameCaseModal = React.memo(RenameCaseModalComponent);
