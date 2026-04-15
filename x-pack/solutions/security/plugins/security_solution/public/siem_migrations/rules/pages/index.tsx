/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import { EuiSkeletonLoading, EuiSkeletonText, EuiSkeletonTitle, EuiSpacer } from '@elastic/eui';
import type { RelatedIntegration } from '../../../../common/api/detection_engine';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import type { RuleMigrationStats } from '../types';

import { MigrationRulesTable } from '../components/rules_table';
import { NeedAdminForUpdateRulesCallOut } from '../../../detection_engine/rule_management/components/callouts/need_admin_for_update_rules_callout';
import { MissingPrivilegesCallOut } from './missing_privileges_callout';
import { UnknownMigration } from '../../common/components';
import { useSelectedMigration } from '../../common/hooks/use_selected_migration';
import { RuleMigrationDataInputWrapper } from '../components/data_input_flyout/data_input_wrapper';
import { MigrationReadyPanel } from '../components/migration_status_panels/migration_ready_panel';
import { MigrationProgressPanel } from '../../common/components/migration_panels/migration_progress_panel';
import { useInvalidateGetMigrationRules } from '../logic/use_get_migration_rules';
import { useInvalidateGetMigrationTranslationStats } from '../logic/use_get_migration_translation_stats';
import { useGetIntegrations } from '../service/hooks/use_get_integrations';
import { RuleMigrationsUploadMissingPanel } from '../components/migration_status_panels/upload_missing_panel';
import { EmptyMigrationRulesPage } from './empty';
import { MigrationsTabs } from '../../common/components/migrations_tabs';
import { MigrationContextHeader } from '../../common/components/migration_context_header';

export const MigrationRulesPage: React.FC = React.memo(() => {
  const {
    selectedMigration: selectedMigrationBase,
    allMigrations: allMigrationsBase,
    isLoading,
    refreshStats,
    isAllSelected,
  } = useSelectedMigration();

  // Rules page works exclusively with rule migration stats
  const selectedMigration = selectedMigrationBase as RuleMigrationStats | undefined;
  const allMigrations = allMigrationsBase as RuleMigrationStats[];

  const [integrations, setIntegrations] = React.useState<
    Record<string, RelatedIntegration> | undefined
  >();
  const { getIntegrations, isLoading: isIntegrationsLoading } = useGetIntegrations(setIntegrations);

  useEffect(() => {
    getIntegrations();
  }, [getIntegrations]);

  const invalidateGetRuleMigrations = useInvalidateGetMigrationRules();
  const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();
  const refetchData = useCallback(() => {
    if (!selectedMigration?.id) {
      return;
    }
    refreshStats();
    invalidateGetRuleMigrations(selectedMigration.id);
    invalidateGetMigrationTranslationStats(selectedMigration.id);
  }, [
    invalidateGetMigrationTranslationStats,
    invalidateGetRuleMigrations,
    selectedMigration?.id,
    refreshStats,
  ]);

  const content = useMemo(() => {
    if (allMigrations.length === 0) {
      return <EmptyMigrationRulesPage />;
    }

    // When "all" is selected use the most recent migration for the rules table
    if (isAllSelected) {
      const mostRecent = allMigrations[0];
      return (
        <RuleMigrationDataInputWrapper onFlyoutClosed={refetchData}>
          <>
            <RuleMigrationsUploadMissingPanel migrationStats={mostRecent} topSpacerSize="s" />
            <EuiSpacer size="m" />
            <MigrationRulesTable
              refetchData={refetchData}
              integrations={integrations}
              isIntegrationsLoading={isIntegrationsLoading}
              migrationStats={mostRecent}
            />
          </>
        </RuleMigrationDataInputWrapper>
      );
    }

    if (!selectedMigration) {
      return <UnknownMigration />;
    }
    return (
      <RuleMigrationDataInputWrapper onFlyoutClosed={refetchData}>
        <>
          {selectedMigration.status === SiemMigrationTaskStatus.FINISHED && (
            <>
              <RuleMigrationsUploadMissingPanel
                migrationStats={selectedMigration}
                topSpacerSize="s"
              />
              <EuiSpacer size="m" />
              <MigrationRulesTable
                refetchData={refetchData}
                integrations={integrations}
                isIntegrationsLoading={isIntegrationsLoading}
                migrationStats={selectedMigration}
              />
            </>
          )}
          {[
            SiemMigrationTaskStatus.READY,
            SiemMigrationTaskStatus.INTERRUPTED,
            SiemMigrationTaskStatus.STOPPED,
          ].includes(selectedMigration.status) && (
            <MigrationReadyPanel migrationStats={selectedMigration} />
          )}
          {selectedMigration.status === SiemMigrationTaskStatus.RUNNING && (
            <MigrationProgressPanel migrationStats={selectedMigration} migrationType="rule" />
          )}
        </>
      </RuleMigrationDataInputWrapper>
    );
  }, [
    selectedMigration,
    refetchData,
    allMigrations,
    integrations,
    isIntegrationsLoading,
    isAllSelected,
  ]);

  return (
    <SecuritySolutionPageWrapper>
      <MigrationsTabs />
      <EuiSpacer size="m" />
      <MigrationContextHeader />
      <EuiSpacer size="m" />
      <NeedAdminForUpdateRulesCallOut />
      <MissingPrivilegesCallOut />
      <EuiSkeletonLoading
        key={selectedMigration?.id}
        data-test-subj="migrationRulesPageLoading"
        isLoading={isLoading}
        loadingContent={
          <>
            <EuiSkeletonTitle />
            <EuiSkeletonText />
          </>
        }
        loadedContent={content}
      />
    </SecuritySolutionPageWrapper>
  );
});
MigrationRulesPage.displayName = 'MigrationRulesPage';
