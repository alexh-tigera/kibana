/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { EuiSkeletonLoading, EuiSkeletonText, EuiSkeletonTitle, EuiSpacer } from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';

import { UnknownMigration } from '../../common/components';
import { EmptyMigrationDashboardsPage } from './empty';
import { useLatestStats } from '../service/hooks/use_latest_stats';
import { MigrationDashboardsTable } from '../components/dashboard_table';
import { useInvalidateGetMigrationDashboards } from '../logic/use_get_migration_dashboards';
import { useInvalidateGetMigrationTranslationStats } from '../logic/use_get_migration_translation_stats';
import { MigrationProgressPanel } from '../../common/components/migration_panels/migration_progress_panel';
import { DashboardMigrationsUploadMissingPanel } from '../components/migration_status_panels/upload_missing_panel';
import { MigrationReadyPanel } from '../components/migration_status_panels/migration_ready_panel';
import { DashboardMigrationDataInputWrapper } from '../components/data_input_flyout/wrapper';
import { MigrationsTabs } from '../../common/components/migrations_tabs';
import { MigrationContextHeader } from '../../common/components/migration_context_header';
import { useSelectedMigration } from '../../common/hooks/use_selected_migration';

export const MigrationDashboardsPage: React.FC = React.memo(() => {
  // useSelectedMigration uses rules stats for ID tracking (rules and dashboards share migration IDs)
  const { selectedMigration, allMigrations, isLoading, isAllSelected } = useSelectedMigration();

  // Dashboard-specific stats for table data
  const { data: dashboardData, refreshStats: refreshDashboardStats } = useLatestStats();
  const dashboardMigrationsStats = useMemo(() => dashboardData.slice().reverse(), [dashboardData]);

  const invalidateGetMigrationDashboards = useInvalidateGetMigrationDashboards();
  const invalidateGetMigrationTranslationStats = useInvalidateGetMigrationTranslationStats();
  const refetchData = useCallback(() => {
    if (!selectedMigration?.id) {
      return;
    }
    refreshDashboardStats();
    invalidateGetMigrationDashboards(selectedMigration.id);
    invalidateGetMigrationTranslationStats(selectedMigration.id);
  }, [
    invalidateGetMigrationDashboards,
    invalidateGetMigrationTranslationStats,
    selectedMigration?.id,
    refreshDashboardStats,
  ]);

  const content = useMemo(() => {
    if (allMigrations.length === 0) {
      return <EmptyMigrationDashboardsPage />;
    }

    // When "all" is selected, use the most recent migration's dashboard stats
    if (isAllSelected) {
      const mostRecentDashboardStats = dashboardMigrationsStats[0];
      if (!mostRecentDashboardStats) {
        return <UnknownMigration />;
      }
      return (
        <DashboardMigrationDataInputWrapper onFlyoutClosed={refetchData}>
          <>
            <DashboardMigrationsUploadMissingPanel
              migrationStats={mostRecentDashboardStats}
              topSpacerSize="s"
            />
            <EuiSpacer size="m" />
            <MigrationDashboardsTable
              refetchData={refetchData}
              migrationStats={mostRecentDashboardStats}
            />
          </>
        </DashboardMigrationDataInputWrapper>
      );
    }

    if (!selectedMigration) {
      return <UnknownMigration />;
    }

    const dashboardStats = dashboardMigrationsStats.find((s) => s.id === selectedMigration.id);
    if (!dashboardStats) {
      return <UnknownMigration />;
    }

    return (
      <DashboardMigrationDataInputWrapper onFlyoutClosed={refetchData}>
        <>
          {dashboardStats.status === SiemMigrationTaskStatus.RUNNING && (
            <MigrationProgressPanel migrationStats={dashboardStats} migrationType="dashboard" />
          )}
          {dashboardStats.status === SiemMigrationTaskStatus.FINISHED && (
            <>
              <DashboardMigrationsUploadMissingPanel
                migrationStats={dashboardStats}
                topSpacerSize="s"
              />
              <EuiSpacer size="m" />
              <MigrationDashboardsTable refetchData={refetchData} migrationStats={dashboardStats} />
            </>
          )}
          {[
            SiemMigrationTaskStatus.READY,
            SiemMigrationTaskStatus.INTERRUPTED,
            SiemMigrationTaskStatus.STOPPED,
          ].includes(dashboardStats.status) && (
            <MigrationReadyPanel migrationStats={dashboardStats} />
          )}
        </>
      </DashboardMigrationDataInputWrapper>
    );
  }, [
    dashboardMigrationsStats,
    allMigrations.length,
    selectedMigration,
    refetchData,
    isAllSelected,
  ]);

  return (
    <SecuritySolutionPageWrapper>
      <MigrationsTabs />
      <EuiSpacer size="m" />
      <MigrationContextHeader />
      <EuiSpacer size="m" />
      <EuiSkeletonLoading
        key={selectedMigration?.id}
        data-test-subj="migrationDashboardsPageLoading"
        isLoading={isLoading}
        loadingContent={
          <>
            <EuiSkeletonTitle data-test-subj="loadingSkeletonTitle" />
            <EuiSkeletonText data-test-subj="loadingSkeletonText" />
          </>
        }
        loadedContent={content}
      />
    </SecuritySolutionPageWrapper>
  );
});
MigrationDashboardsPage.displayName = 'MigrationDashboardsPage';
