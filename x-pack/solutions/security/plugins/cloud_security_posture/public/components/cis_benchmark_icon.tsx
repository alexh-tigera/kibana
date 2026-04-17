/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconSize } from '@elastic/eui';
import { EuiIconTip } from '@elastic/eui';
import type { CSSInterpolation } from '@emotion/serialize';
import type { BenchmarkId } from '@kbn/cloud-security-posture-common';
import cisEksIcon from '../assets/icons/cis_eks_logo.svg';
import googleCloudLogo from '../assets/icons/google_cloud_logo.svg';

interface Props {
  type: BenchmarkId;
  name?: string;
  style?: CSSInterpolation;
  size?: IconSize;
}

const getBenchmarkIdIconType = (type: BenchmarkId): string | undefined => {
  switch (type) {
    case 'cis_eks':
      return cisEksIcon;
    case 'cis_azure':
      return 'logoAzure';
    case 'cis_aws':
      return 'logoAWS';
    case 'cis_gcp':
      return googleCloudLogo;
    case 'cis_k8s':
      return 'logoKubernetes';
  }
};

const getDefaultBenchmarkLabel = (type: BenchmarkId): string | undefined => {
  switch (type) {
    case 'cis_eks':
      return 'Amazon Elastic Kubernetes Service (EKS)';
    case 'cis_azure':
      return 'Microsoft Azure';
    case 'cis_aws':
      return 'Amazon Web Services';
    case 'cis_gcp':
      return 'Google Cloud Platform';
    case 'cis_k8s':
      return 'Kubernetes';
  }
};

export const CISBenchmarkIcon = (props: Props) => {
  const iconType = getBenchmarkIdIconType(props.type);
  if (!iconType) return <></>;

  const label = props.name || getDefaultBenchmarkLabel(props.type);
  return <EuiIconTip content={label} type={iconType} size={props.size || 'xl'} css={props.style} />;
};
