/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SWITCH_MIGRATION_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.switchMigration',
  { defaultMessage: 'Switch migration' }
);

export const NEW_MIGRATION_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.newMigration',
  { defaultMessage: 'New migration' }
);

export const START_NEW_MIGRATION_OPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.startNewMigration',
  { defaultMessage: 'Start new migration' }
);

export const STAT_TOTAL = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.stats.total',
  { defaultMessage: 'Total' }
);

export const STAT_TRANSLATED = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.stats.translated',
  { defaultMessage: 'Translated' }
);

export const STAT_NEEDS_REVIEW = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.stats.needsReview',
  { defaultMessage: 'Needs review' }
);

export const STAT_NOT_TRANSLATED = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.stats.notTranslated',
  { defaultMessage: 'Not translated' }
);

export const ACTION_START_TRANSLATION = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.action.startTranslation',
  { defaultMessage: 'Start translation' }
);

export const ACTION_RESUME_MIGRATION = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.action.resumeMigration',
  { defaultMessage: 'Resume migration' }
);

export const ACTION_RETRY_MIGRATION = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.action.retryMigration',
  { defaultMessage: 'Retry migration' }
);

export const MIGRATION_RUNNING_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.migrationRunning',
  { defaultMessage: 'Translation in progress…' }
);

export const START_MIGRATION_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.startMigrationModal.title',
  { defaultMessage: 'Start translation' }
);

export const START_MIGRATION_MODAL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.startMigrationModal.description',
  {
    defaultMessage:
      'Select an AI connector to use for the translation of your SIEM rules into Elastic Security rules.',
  }
);

export const NEW_MIGRATION_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.newMigrationModal.title',
  { defaultMessage: 'New migration' }
);

export const NEW_MIGRATION_MODAL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.newMigrationModal.description',
  {
    defaultMessage:
      'Select an AI connector to use for the translation of your SIEM rules into Elastic Security rules.',
  }
);

export const ALL_MIGRATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.contextHeader.allMigrationsTitle',
  { defaultMessage: 'All migrations' }
);

export const ALL_MIGRATIONS_SUBTITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.contextHeader.allMigrationsSubtitle', {
    defaultMessage: '{count} {count, plural, one {migration} other {migrations}} · aggregate view',
    values: { count },
  });

export const MIGRATION_RULES_SUBTITLE = (count: number, statusLabel: string) =>
  i18n.translate('xpack.securitySolution.siemMigrations.contextHeader.migrationRulesSubtitle', {
    defaultMessage: '{count} {count, plural, one {rule} other {rules}} · {statusLabel}',
    values: { count, statusLabel },
  });
