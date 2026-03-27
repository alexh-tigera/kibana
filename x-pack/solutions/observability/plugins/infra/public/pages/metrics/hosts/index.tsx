/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { css } from '@emotion/react';
import { OnboardingFlow } from '../../../components/shared/templates/no_data_config';
import { InfraPageTemplate } from '../../../components/shared/templates/infra_page_template';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { hostsTitle } from '../../../translations';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { HostsContainer } from './components/hosts_container';

export const HostsPage = () => {
  const { chrome } = useKibana().services;
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  useTrackPageview({ app: 'infra_metrics', path: 'hosts' });
  useTrackPageview({ app: 'infra_metrics', path: 'hosts', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: hostsTitle,
    },
  ]);

  return (
    <div className={APP_WRAPPER_CLASS}>
      <InfraPageTemplate
        dataSourceAvailability="host"
        onboardingFlow={OnboardingFlow.Hosts}
        pageHeader={
          !isProjectChrome
            ? {
                alignItems: 'center',
                pageTitle: (
                  <div
                    css={css`
                      display: flex;
                      align-items: center;
                      gap: 0.75rem;
                    `}
                  >
                    <h1>{hostsTitle}</h1>
                  </div>
                ),
              }
            : undefined
        }
        pageSectionProps={{
          contentProps: {
            css: fullHeightContentStyles,
          },
        }}
      >
        <HostsContainer />
      </InfraPageTemplate>
    </div>
  );
};
