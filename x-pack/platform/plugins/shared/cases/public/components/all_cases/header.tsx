/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { HeaderPage } from '../header_page';
import * as i18n from './translations';

/**
 * Page title for All Cases. Settings and Create actions were moved to chrome
 * AppMenu via useAllCasesAppMenu in AllCases.
 */
export const CasesTableHeader: FunctionComponent = () => {
  return <HeaderPage title={i18n.PAGE_TITLE} border data-test-subj="cases-all-title" />;
};
CasesTableHeader.displayName = 'CasesTableHeader';
