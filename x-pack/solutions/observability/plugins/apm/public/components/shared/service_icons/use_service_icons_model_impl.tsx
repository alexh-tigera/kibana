/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import type { CloudProvider } from '@kbn/custom-icons';
import { getAgentIcon, getCloudProviderIcon, getServerlessIcon } from '@kbn/custom-icons';
import React, { useMemo, useState } from 'react';
import { isOpenTelemetryAgentName } from '../../../../common/agent_name';
import { ServerlessType } from '../../../../common/serverless';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { CloudDetails } from './cloud_details';
import { ContainerDetails } from './container_details';
import { OTelDetails } from './otel_details';
import { ServerlessDetails } from './serverless_details';
import { ServiceDetails } from './service_details';
import type {
  ServiceIconsPopoverItem,
  ServiceIconsPopoverKey,
} from './service_icons_popover_types';
import { getContainerIcon } from './get_container_icon';

function getServerlessTitle(serverlessType?: ServerlessType): string {
  switch (serverlessType) {
    case ServerlessType.AWS_LAMBDA: {
      return i18n.translate('xpack.apm.serviceIcons.aws_lambda', {
        defaultMessage: 'AWS Lambda',
      });
    }
    case ServerlessType.AZURE_FUNCTIONS: {
      return i18n.translate('xpack.apm.serviceIcons.azure_functions', {
        defaultMessage: 'Azure Functions',
      });
    }
    default: {
      return i18n.translate('xpack.apm.serviceIcons.serverless', {
        defaultMessage: 'Serverless',
      });
    }
  }
}

interface UseServiceIconsModelArgs {
  serviceName: string;
  environment: string;
  start: string;
  end: string;
}

export function useServiceIconsModel({
  serviceName,
  environment,
  start,
  end,
}: UseServiceIconsModelArgs) {
  const isDarkMode = useKibanaIsDarkMode();
  const [selectedIconPopover, setSelectedIconPopover] = useState<ServiceIconsPopoverKey | null>();

  const { data: icons, status: iconsFetchStatus } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi('GET /internal/apm/services/{serviceName}/metadata/icons', {
          params: {
            path: { serviceName },
            query: { start, end },
          },
        });
      }
    },
    [serviceName, start, end]
  );

  const { data: details, status: detailsFetchStatus } = useFetcher(
    (callApmApi) => {
      if (selectedIconPopover && serviceName && start && end && environment) {
        return callApmApi('GET /internal/apm/services/{serviceName}/metadata/details', {
          isCachable: true,
          params: {
            path: { serviceName },
            query: { start, end, environment },
          },
        });
      }
    },
    [selectedIconPopover, serviceName, start, end, environment]
  );

  const popoverItems: ServiceIconsPopoverItem[] = useMemo(
    () => [
      {
        key: 'service',
        icon: {
          type: getAgentIcon(icons?.agentName, isDarkMode) || 'node',
        },
        isVisible: !!icons?.agentName,
        title: i18n.translate('xpack.apm.serviceIcons.service', {
          defaultMessage: 'Service',
        }),
        component: <ServiceDetails service={details?.service} />,
      },
      {
        key: 'opentelemetry',
        icon: {
          type: getAgentIcon('opentelemetry', isDarkMode),
        },
        isVisible: !!icons?.agentName && isOpenTelemetryAgentName(icons.agentName),
        title: i18n.translate('xpack.apm.serviceIcons.opentelemetry', {
          defaultMessage: 'OpenTelemetry',
        }),
        component: <OTelDetails opentelemetry={details?.opentelemetry} />,
      },
      {
        key: 'container',
        icon: {
          type: getContainerIcon(icons?.containerType),
        },
        isVisible: !!icons?.containerType,
        title: i18n.translate('xpack.apm.serviceIcons.container', {
          defaultMessage: 'Container',
        }),
        component: (
          <ContainerDetails container={details?.container} kubernetes={details?.kubernetes} />
        ),
      },
      {
        key: 'serverless',
        icon: {
          type: getServerlessIcon(icons?.serverlessType) || 'node',
        },
        isVisible: !!icons?.serverlessType,
        title: getServerlessTitle(icons?.serverlessType),
        component: <ServerlessDetails serverless={details?.serverless} />,
      },
      {
        key: 'cloud',
        icon: {
          type: getCloudProviderIcon(icons?.cloudProvider as CloudProvider),
        },
        isVisible: !!icons?.cloudProvider,
        title: i18n.translate('xpack.apm.serviceIcons.cloud', {
          defaultMessage: 'Cloud',
        }),
        component: <CloudDetails cloud={details?.cloud} isServerless={!!details?.serverless} />,
      },
    ],
    [icons, details, isDarkMode]
  );

  const isLoading = !icons && iconsFetchStatus === FETCH_STATUS.LOADING;

  return {
    popoverItems,
    selectedIconPopover,
    setSelectedIconPopover,
    detailsFetchStatus,
    isLoading,
  };
}
