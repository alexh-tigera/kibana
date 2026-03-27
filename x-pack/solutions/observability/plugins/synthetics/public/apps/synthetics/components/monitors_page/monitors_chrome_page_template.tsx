/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';

import type { ClientPluginsStart } from '../../../../plugin';
import { SyntheticsPageTemplateComponent } from '../common/page_template/synthetics_page_template';

/**
 * Overview / Management: project chrome shows Overview ↔ Management tabs via
 * {@link MonitorsProjectAppMenu} `headerTabs`; omit duplicate EuiPageHeader tabs in project mode.
 */
export function MonitorsChromePageTemplate(props: LazyObservabilityPageTemplateProps) {
  const {
    services: { chrome },
  } = useKibana<ClientPluginsStart>();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const pageHeader =
    props.pageHeader && isProjectChrome && props.pageHeader.tabs
      ? { ...props.pageHeader, tabs: undefined }
      : props.pageHeader;

  return <SyntheticsPageTemplateComponent {...props} pageHeader={pageHeader} />;
}
