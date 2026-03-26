/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMenu } from '@kbn/core-chrome-app-menu';
import React from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmAppMenuConfig } from '../../../hooks/use_apm_app_menu_config';

export function ApmProjectAppMenu() {
  const { core } = useApmPluginContext();
  const config = useApmAppMenuConfig();

  return <AppMenu config={config} setAppMenu={core.chrome.setAppMenu} />;
}
