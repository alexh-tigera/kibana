/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';
import { CasesTableHeader } from './header';

describe('CasesTableHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the all cases page title', () => {
    renderWithTestingProviders(<CasesTableHeader />);

    expect(screen.getByTestId('cases-all-title')).toBeInTheDocument();
  });

  it('does not render header action buttons (moved to chrome AppMenu)', () => {
    renderWithTestingProviders(<CasesTableHeader />);

    expect(screen.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('configure-case-button')).not.toBeInTheDocument();
  });
});
