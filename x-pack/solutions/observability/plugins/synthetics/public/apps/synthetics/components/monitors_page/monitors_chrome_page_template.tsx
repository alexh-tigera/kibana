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
 * Overview / Management: in project chrome the legacy EuiPageHeader is hidden; title, tabs, and
 * actions come from project chrome ({@link MonitorsProjectAppMenu} + breadcrumbs). Classic chrome
 * keeps the full page header from route config.
 */
export function MonitorsChromePageTemplate(props: LazyObservabilityPageTemplateProps) {
  const {
    services: { chrome },
  } = useKibana<ClientPluginsStart>();
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const pageHeader = isProjectChrome ? undefined : props.pageHeader;

  return <SyntheticsPageTemplateComponent {...props} pageHeader={pageHeader} />;
}
