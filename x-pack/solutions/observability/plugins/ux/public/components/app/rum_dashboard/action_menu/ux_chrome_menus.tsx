/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { AppMountParameters } from '@kbn/core/public';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { UXActionMenu } from './index';

export function UxChromeMenus({
  appMountParameters,
  isDev,
}: {
  appMountParameters: AppMountParameters;
  isDev: boolean;
}) {
  const { chrome } = useKibanaServices();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());

  if (chromeStyle === 'project') {
    return null;
  }

  return <UXActionMenu appMountParameters={appMountParameters} isDev={isDev} />;
}
