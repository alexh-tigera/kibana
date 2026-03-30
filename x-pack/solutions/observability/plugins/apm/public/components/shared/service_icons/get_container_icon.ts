/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerType } from '../../../../common/service_metadata';

export function getContainerIcon(container?: ContainerType) {
  if (!container) {
    return;
  }
  switch (container) {
    case 'Kubernetes':
      return 'logoKubernetes';
    default:
      return 'logoDocker';
  }
}
