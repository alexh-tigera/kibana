/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiStat,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { useGetMigrationTranslationStats } from '../../../rules/logic/use_get_migration_translation_stats';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import { OnboardingCardId, OnboardingTopicId } from '../../../../onboarding/constants';
import type { MigrationStats } from '../../types';
import { MIGRATION_VENDOR_DISPLAY_NAME } from '../../constants';
import { useSelectedMigration } from '../../hooks/use_selected_migration';
import * as i18n from './translations';

export interface MigrationContextHeaderProps {
  /** @deprecated pass-through props kept for backwards-compat; hook handles state internally */
  selectedMigration?: MigrationStats | undefined;
  allMigrations?: MigrationStats[];
  isLoading?: boolean;
  onMigrationIdChange?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

function statusBadgeColor(status: SiemMigrationTaskStatus, completedCount: number): string {
  switch (status) {
    case SiemMigrationTaskStatus.FINISHED:
      return completedCount > 0 ? 'success' : 'danger';
    case SiemMigrationTaskStatus.RUNNING:
      return 'primary';
    case SiemMigrationTaskStatus.READY:
      return 'default';
    case SiemMigrationTaskStatus.STOPPED:
    case SiemMigrationTaskStatus.INTERRUPTED:
      return 'warning';
    default:
      return 'default';
  }
}

function statusBadgeLabel(status: SiemMigrationTaskStatus, completedCount: number): string {
  switch (status) {
    case SiemMigrationTaskStatus.FINISHED:
      return completedCount > 0 ? 'Done' : 'Failed';
    case SiemMigrationTaskStatus.RUNNING:
      return 'Running';
    case SiemMigrationTaskStatus.READY:
      return 'Ready';
    case SiemMigrationTaskStatus.STOPPED:
    case SiemMigrationTaskStatus.INTERRUPTED:
      return 'Paused';
    default:
      return status;
  }
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------

interface MigrationStatsRowProps {
  total: number;
  completed: number;
  failed: number;
  needsReview: number;
}

const MigrationStatsRow: React.FC<MigrationStatsRowProps> = React.memo(
  ({ total, completed, failed, needsReview }) => {
    const notTranslated = total - completed - failed;
    return (
      <EuiFlexGroup gutterSize="l" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={total}
            description={i18n.STAT_TOTAL}
            titleSize="s"
            data-test-subj="migrationStatTotal"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={completed}
            description={i18n.STAT_TRANSLATED}
            titleColor="success"
            titleSize="s"
            data-test-subj="migrationStatTranslated"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={needsReview}
            description={i18n.STAT_NEEDS_REVIEW}
            titleColor={needsReview > 0 ? 'warning' : 'subdued'}
            titleSize="s"
            data-test-subj="migrationStatNeedsReview"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={notTranslated < 0 ? 0 : notTranslated}
            description={i18n.STAT_NOT_TRANSLATED}
            titleColor="subdued"
            titleSize="s"
            data-test-subj="migrationStatNotTranslated"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
MigrationStatsRow.displayName = 'MigrationStatsRow';

// ---------------------------------------------------------------------------
// Inner content (rendered when loaded)
// ---------------------------------------------------------------------------

const MigrationContextHeaderContent: React.FC = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { selectedMigration, allMigrations, isAllSelected, setSelectedMigrationId } =
    useSelectedMigration();

  const translationStatsResult = useGetMigrationTranslationStats(selectedMigration?.id ?? '');

  const needsReviewCount = useMemo(() => {
    if (!translationStatsResult.data) return 0;
    const { success } = translationStatsResult.data.rules;
    return success.total - success.installable - success.prebuilt;
  }, [translationStatsResult.data]);

  // Aggregate or per-migration stats
  const stats = useMemo<MigrationStatsRowProps>(() => {
    if (isAllSelected) {
      return {
        total: allMigrations.reduce((sum, m) => sum + m.items.total, 0),
        completed: allMigrations.reduce((sum, m) => sum + m.items.completed, 0),
        failed: allMigrations.reduce((sum, m) => sum + m.items.failed, 0),
        needsReview: 0,
      };
    }
    return {
      total: selectedMigration?.items.total ?? 0,
      completed: selectedMigration?.items.completed ?? 0,
      failed: selectedMigration?.items.failed ?? 0,
      needsReview: needsReviewCount,
    };
  }, [isAllSelected, allMigrations, selectedMigration, needsReviewCount]);

  const handleSelectMigration = useCallback(
    (id: string) => {
      setSelectedMigrationId(id);
      setIsPopoverOpen(false);
    },
    [setSelectedMigrationId]
  );

  // Title trigger button
  const titleTrigger = (
    <EuiButtonEmpty
      flush="left"
      size="s"
      onClick={() => setIsPopoverOpen((v) => !v)}
      data-test-subj="migrationTitleDropdownTrigger"
    >
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          {isAllSelected ? (
            <EuiText size="s" color="subdued">
              <strong>{i18n.ALL_MIGRATIONS_TITLE}</strong>
            </EuiText>
          ) : (
            <EuiText size="s">
              <strong data-test-subj="migrationName">{selectedMigration?.name ?? '…'}</strong>
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="arrowDown" size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiButtonEmpty>
  );

  const popoverContent = (
    <div
      css={css`
        min-width: 320px;
      `}
    >
      {/* All migrations option */}
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        css={css`
          padding: 8px 12px;
          cursor: pointer;
          &:hover {
            background: ${euiTheme.colors.backgroundBaseSubdued};
          }
        `}
        onClick={() => handleSelectMigration('all')}
        data-test-subj="migrationOptionAll"
      >
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{i18n.ALL_MIGRATIONS_TITLE}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {i18n.ALL_MIGRATIONS_SUBTITLE(allMigrations.length)}
          </EuiText>
        </EuiFlexItem>
        {isAllSelected && (
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" color="success" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />

      {/* Individual migrations */}
      {allMigrations.map((migration) => (
        <EuiFlexGroup
          key={migration.id}
          alignItems="center"
          gutterSize="s"
          css={css`
            padding: 8px 12px;
            cursor: pointer;
            &:hover {
              background: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
          onClick={() => handleSelectMigration(migration.id)}
          data-test-subj={`migrationOption-${migration.id}`}
        >
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{migration.name}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {i18n.MIGRATION_RULES_SUBTITLE(
                migration.items.total,
                statusBadgeLabel(migration.status, migration.items.completed)
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={statusBadgeColor(migration.status, migration.items.completed)}>
              {statusBadgeLabel(migration.status, migration.items.completed)}
            </EuiBadge>
          </EuiFlexItem>
          {migration.id === selectedMigration?.id && !isAllSelected && (
            <EuiFlexItem grow={false}>
              <EuiIcon type="checkInCircleFilled" color="success" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ))}

      <EuiHorizontalRule margin="none" />

      {/* Start new migration */}
      <div
        css={css`
          padding: 4px 8px;
        `}
      >
        <SecuritySolutionLinkButton
          color="primary"
          iconType="plusInCircle"
          size="s"
          deepLinkId={SecurityPageName.landing}
          path={`${OnboardingTopicId.siemMigrations}#${OnboardingCardId.siemMigrationsRules}`}
          data-test-subj="newMigrationPopoverButton"
          onClick={() => setIsPopoverOpen(false)}
        >
          {i18n.START_NEW_MIGRATION_OPTION}
        </SecuritySolutionLinkButton>
      </div>
    </div>
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj="migrationContextHeader">
      {/* Top row */}
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        {/* Left: title dropdown trigger + vendor badge */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={titleTrigger}
                isOpen={isPopoverOpen}
                closePopover={() => setIsPopoverOpen(false)}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                {popoverContent}
              </EuiPopover>
            </EuiFlexItem>

            {/* Vendor badge - only when a single migration is selected */}
            {!isAllSelected && selectedMigration?.vendor && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="migrationVendorBadge">
                  {MIGRATION_VENDOR_DISPLAY_NAME[selectedMigration.vendor]}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Right: New migration button */}
        <EuiFlexItem grow={false}>
          <SecuritySolutionLinkButton
            iconType="plusInCircle"
            deepLinkId={SecurityPageName.landing}
            path={`${OnboardingTopicId.siemMigrations}#${OnboardingCardId.siemMigrationsRules}`}
            data-test-subj="newMigrationButton"
          >
            {i18n.NEW_MIGRATION_BUTTON}
          </SecuritySolutionLinkButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Stats row */}
      <MigrationStatsRow
        total={stats.total}
        completed={stats.completed}
        failed={stats.failed}
        needsReview={stats.needsReview}
      />
    </EuiPanel>
  );
});
MigrationContextHeaderContent.displayName = 'MigrationContextHeaderContent';

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export const MigrationContextHeader: React.FC<MigrationContextHeaderProps> = React.memo(
  ({ isLoading }) => {
    const { isLoading: hookLoading } = useSelectedMigration();
    const loading = isLoading ?? hookLoading;

    return (
      <EuiSkeletonLoading
        isLoading={loading}
        loadingContent={
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiSkeletonTitle size="xs" />
            <EuiSpacer size="s" />
            <EuiSkeletonText lines={1} />
          </EuiPanel>
        }
        loadedContent={<MigrationContextHeaderContent />}
      />
    );
  }
);
MigrationContextHeader.displayName = 'MigrationContextHeader';
