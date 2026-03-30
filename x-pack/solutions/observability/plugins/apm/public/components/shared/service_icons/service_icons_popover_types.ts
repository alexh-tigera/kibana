/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactChild } from 'react';

export type ServiceIconsPopoverKey =
  | 'service'
  | 'opentelemetry'
  | 'container'
  | 'serverless'
  | 'cloud'
  | 'alerts';

export interface ServiceIconsPopoverItem {
  key: ServiceIconsPopoverKey;
  icon: {
    type?: string;
    size?: 's' | 'm' | 'l';
  };
  isVisible: boolean;
  title: string;
  component: ReactChild;
}
