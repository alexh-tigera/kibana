/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';
import { MarkdownEditor } from './editor';

jest.mock('../../common/lib/kibana');

const defaultProps = {
  ariaLabel: 'test markdown editor',
  'data-test-subj': 'test-markdown',
  editorId: 'test-editor-id',
  onChange: jest.fn(),
  value: '',
};

describe('MarkdownEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the markdown editor', () => {
    renderWithTestingProviders(<MarkdownEditor {...defaultProps} />);
    expect(screen.getByTestId('test-markdown')).toBeInTheDocument();
  });

  it('does not have role="button" on the drop zone to avoid nested interactive controls', () => {
    renderWithTestingProviders(<MarkdownEditor {...defaultProps} />);
    const dropZone = document.querySelector('.euiMarkdownEditorDropZone');
    expect(dropZone).toBeInTheDocument();
    expect(dropZone).not.toHaveAttribute('role', 'button');
  });
});
