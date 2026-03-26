/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALL_VALUE } from '@kbn/slo-schema';
import { ApmRuleType } from '@kbn/rule-data-utils';
import type { ApmIndicatorType } from '../../../common/slo_indicator_types';
import { APM_SLO_INDICATOR_TYPES } from '../../../common/slo_indicator_types';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import type { ApmPluginStartDeps } from '../../plugin';
import { useApmParams } from '../../hooks/use_apm_params';
import { useServiceName } from '../../hooks/use_service_name';
import { AlertingFlyout } from '../../components/alerting/ui_components/alerting_flyout';

export interface ApmHeaderFlyoutsContextValue {
  openAlertRuleType: (ruleType: ApmRuleType | null) => void;
  openSloIndicatorType: (indicatorType: ApmIndicatorType | null) => void;
}

const ApmHeaderFlyoutsContext = createContext<ApmHeaderFlyoutsContextValue | null>(null);

export function ApmHeaderFlyoutsProvider({ children }: { children: React.ReactNode }) {
  const { slo } = useKibana<ApmPluginStartDeps>().services;
  const { query } = useApmParams('/*');
  const serviceName = useServiceName();
  const [ruleType, setRuleType] = useState<ApmRuleType | null>(null);
  const [sloIndicator, setSloIndicator] = useState<ApmIndicatorType | null>(null);

  const apmEnvironment = ('environment' in query && query.environment) || ENVIRONMENT_ALL.value;
  const sloEnvironment = apmEnvironment === ENVIRONMENT_ALL.value ? ALL_VALUE : apmEnvironment;

  const openAlertRuleType = useCallback((next: ApmRuleType | null) => {
    setRuleType(next);
  }, []);

  const openSloIndicatorType = useCallback((next: ApmIndicatorType | null) => {
    setSloIndicator(next);
  }, []);

  const value = useMemo(
    () => ({ openAlertRuleType, openSloIndicatorType }),
    [openAlertRuleType, openSloIndicatorType]
  );

  const closeSlo = useCallback(() => setSloIndicator(null), []);

  const CreateSloFlyout =
    sloIndicator && slo
      ? slo.getCreateSLOFormFlyout({
          initialValues: {
            ...(serviceName && { name: `APM SLO for ${serviceName}` }),
            indicator: {
              type: sloIndicator,
              params: {
                ...(serviceName && { service: serviceName }),
                environment: sloEnvironment,
              },
            },
          },
          onClose: closeSlo,
          formSettings: {
            allowedIndicatorTypes: [...APM_SLO_INDICATOR_TYPES],
          },
        })
      : null;

  return (
    <ApmHeaderFlyoutsContext.Provider value={value}>
      {children}
      <AlertingFlyout
        ruleType={ruleType}
        addFlyoutVisible={!!ruleType}
        setAddFlyoutVisibility={(visible) => {
          if (!visible) {
            setRuleType(null);
          }
        }}
      />
      {CreateSloFlyout}
    </ApmHeaderFlyoutsContext.Provider>
  );
}

export function useApmHeaderFlyouts(): ApmHeaderFlyoutsContextValue {
  const ctx = useContext(ApmHeaderFlyoutsContext);
  if (!ctx) {
    throw new Error('useApmHeaderFlyouts must be used within ApmHeaderFlyoutsProvider');
  }
  return ctx;
}
