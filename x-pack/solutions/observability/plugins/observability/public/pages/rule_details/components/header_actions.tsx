/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleDetailsHeaderActionsApi } from '../hooks/use_rule_details_header_actions';

interface HeaderActionsProps {
  api: RuleDetailsHeaderActionsApi;
}

export function HeaderActions({ api }: HeaderActionsProps) {
  if (!api.showClassicHeaderActions) {
    return null;
  }

  return (
    <>
      {api.renderClassicHeaderActions()}
      {api.modals}
    </>
  );
}
