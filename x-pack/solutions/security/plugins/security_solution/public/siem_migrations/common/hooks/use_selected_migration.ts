/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useLatestStats } from '../../rules/service/hooks/use_latest_stats';
import type { MigrationStats } from '../types';

const MIGRATION_ID_QUERY_PARAM = 'migrationId';
const ALL_MIGRATIONS_VALUE = 'all';

export const useSelectedMigration = () => {
  const location = useLocation();
  const history = useHistory();
  const { data, isLoading, refreshStats } = useLatestStats();

  const allMigrations = useMemo(() => data.slice().reverse() as MigrationStats[], [data]);

  const migrationIdParam = useMemo(
    () => new URLSearchParams(location.search).get(MIGRATION_ID_QUERY_PARAM) ?? undefined,
    [location.search]
  );

  const isAllSelected = migrationIdParam === ALL_MIGRATIONS_VALUE;

  // Default to the first (most recent) migration when none is selected
  useEffect(() => {
    if (isLoading || allMigrations.length === 0) {
      return;
    }
    if (!migrationIdParam) {
      const params = new URLSearchParams(location.search);
      params.set(MIGRATION_ID_QUERY_PARAM, allMigrations[0].id);
      history.replace({ search: params.toString() });
    }
  }, [isLoading, migrationIdParam, allMigrations, location.search, history]);

  const setSelectedMigrationId = useCallback(
    (id: string) => {
      const params = new URLSearchParams(location.search);
      params.set(MIGRATION_ID_QUERY_PARAM, id);
      history.push({ search: params.toString() });
    },
    [location.search, history]
  );

  const selectedMigration = useMemo(
    () => (isAllSelected ? undefined : allMigrations.find((m) => m.id === migrationIdParam)),
    [allMigrations, migrationIdParam, isAllSelected]
  );

  return {
    selectedMigration,
    setSelectedMigrationId,
    allMigrations,
    isLoading,
    refreshStats,
    isAllSelected,
  };
};
