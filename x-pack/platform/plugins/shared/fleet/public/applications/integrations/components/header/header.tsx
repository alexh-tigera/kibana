/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiHeaderSectionItem,
  EuiHeaderSection,
  EuiHeaderLinks,
  useEuiTheme,
  EuiToolTip,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { AppMountParameters } from '@kbn/core/public';
import useObservable from 'react-use/lib/useObservable';

import type { FleetStartServices } from '../../../../plugin';
import { useIsReadOnly } from '../../hooks/use_read_only_context';

import { HeaderPortal } from './header_portal';
import { DeploymentDetails } from './deployment_details';

export const IntegrationsHeader = ({
  setHeaderActionMenu,
  startServices,
}: {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  startServices: Pick<FleetStartServices, 'analytics' | 'i18n' | 'theme' | 'chrome'>;
}) => {
  const chromeStyle = useObservable(
    startServices.chrome.getChromeStyle$(),
    startServices.chrome.getChromeStyle()
  );
  const isProjectChrome = chromeStyle === 'project';
  const { euiTheme } = useEuiTheme();
  const readOnlyBtnClass = React.useMemo(() => {
    return css`
      color: ${euiTheme.colors.textParagraph};
    `;
  }, [euiTheme]);
  const isReadOnly = useIsReadOnly();

  return (
    <HeaderPortal {...{ setHeaderActionMenu, startServices }}>
      <EuiHeaderSection grow={false}>
        {!isProjectChrome ? (
          <EuiHeaderSectionItem>
            <EuiHeaderLinks>
              <DeploymentDetails />
            </EuiHeaderLinks>
          </EuiHeaderSectionItem>
        ) : null}
        {isReadOnly ? (
          <EuiHeaderSectionItem>
            <EuiHeaderLinks>
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.fleet.integrations.header.readOnlyTooltip"
                    defaultMessage="You can view Integrations, but to perform all actions you need additional privileges."
                  />
                }
              >
                <EuiButtonEmpty iconType={'glasses'} className={readOnlyBtnClass} disabled={true}>
                  <FormattedMessage
                    id="xpack.fleet.integrations.header.readOnlyBtn"
                    defaultMessage="Read-only"
                  />
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiHeaderLinks>
          </EuiHeaderSectionItem>
        ) : null}
      </EuiHeaderSection>
    </HeaderPortal>
  );
};
