/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import {
  SIEM_MIGRATIONS_DASHBOARDS_PATH,
  SIEM_MIGRATIONS_RULES_PATH,
} from '../../../../../common/constants';
import { useNavigation } from '../../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const TAB_RULES = 'rules';
const TAB_DASHBOARDS = 'dashboards';

interface MigrationsTab {
  id: string;
  name: string;
  path: string;
  experimentalKey?: 'automaticDashboardsMigration';
}

const MIGRATIONS_TABS: MigrationsTab[] = [
  {
    id: TAB_RULES,
    name: i18n.translate('xpack.securitySolution.siemMigrations.tabs.translatedRules', {
      defaultMessage: 'Translated rules',
    }),
    path: SIEM_MIGRATIONS_RULES_PATH,
  },
  {
    id: TAB_DASHBOARDS,
    name: i18n.translate('xpack.securitySolution.siemMigrations.tabs.translatedDashboards', {
      defaultMessage: 'Translated dashboards',
    }),
    path: SIEM_MIGRATIONS_DASHBOARDS_PATH,
    experimentalKey: 'automaticDashboardsMigration',
  },
];

export const MigrationsTabs = React.memo(() => {
  const { getAppUrl } = useNavigation();
  const isDashboardsEnabled = useIsExperimentalFeatureEnabled('automaticDashboardsMigration');

  const matchRules = useRouteMatch(SIEM_MIGRATIONS_RULES_PATH);
  const matchDashboards = useRouteMatch(SIEM_MIGRATIONS_DASHBOARDS_PATH);

  const activeTabId = useMemo(() => {
    if (matchDashboards) return TAB_DASHBOARDS;
    if (matchRules) return TAB_RULES;
    return TAB_RULES;
  }, [matchDashboards, matchRules]);

  const visibleTabs = useMemo(
    () =>
      MIGRATIONS_TABS.filter((tab) => !tab.experimentalKey || isDashboardsEnabled).map((tab) => ({
        ...tab,
        href: getAppUrl({ path: tab.path }),
      })),
    [isDashboardsEnabled, getAppUrl]
  );

  return (
    <EuiTabs size="m" bottomBorder>
      {visibleTabs.map((tab) => (
        <EuiTab key={tab.id} href={tab.href} isSelected={tab.id === activeTabId}>
          {tab.name}
        </EuiTab>
      ))}
    </EuiTabs>
  );
});

MigrationsTabs.displayName = 'MigrationsTabs';
