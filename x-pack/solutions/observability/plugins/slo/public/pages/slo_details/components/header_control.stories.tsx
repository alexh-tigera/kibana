/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { buildSlo } from '../../../data/slo/slo';
import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { useSloDetailsHeaderActions } from '../hooks/use_slo_details_header_actions';
import { HeaderControl as Component } from './header_control';

export default {
  component: Component,
  title: 'app/SLO/DetailsPage/HeaderControl',
  decorators: [KibanaReactStorybookDecorator],
};

function HeaderControlStory() {
  const slo = buildSlo();
  const { classicActionsPopover, modalsAndFlyouts } = useSloDetailsHeaderActions({ slo });
  return <Component classicActionsPopover={classicActionsPopover} modalsAndFlyouts={modalsAndFlyouts} />;
}

export const Default = {
  render: () => <HeaderControlStory />,
};
