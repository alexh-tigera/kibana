/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useEnableRule } from '../../../hooks/use_enable_rule';
import { useDisableRule } from '../../../hooks/use_disable_rule';
import { useRunRule } from '../../../hooks/use_run_rule';
import { useUpdateAPIKey } from '../../../hooks/use_update_api_key';
import { useAppLink } from '../../../hooks/use_app_link';
import { useKibana } from '../../../utils/kibana_react';

export interface UseRuleDetailsHeaderActionsParams {
  ruleId: string;
  rule: Rule | undefined;
  refetch: () => void;
  isLoading: boolean;
  isRuleEditable: boolean;
  onEditRule: () => void;
  onDeleteRule: () => void;
}

export interface RuleDetailsHeaderActionsApi {
  showClassicHeaderActions: boolean;
  modals: React.ReactNode;
  renderClassicHeaderActions: () => React.ReactNode;
  getChromeBarV2Fragment: () => Pick<
    AppMenuConfig,
    'layout' | 'primaryActionItem' | 'secondaryActionItem' | 'overflowOnlyItems'
  >;
}

export function useRuleDetailsHeaderActions({
  ruleId,
  rule,
  refetch,
  isLoading,
  isRuleEditable,
  onEditRule,
  onDeleteRule,
}: UseRuleDetailsHeaderActionsParams): RuleDetailsHeaderActionsApi {
  const { services } = useKibana();
  const { application } = services;
  const {
    triggersActionsUi: {
      getRuleSnoozeModal: RuleSnoozeModal,
      getUntrackModal: UntrackAlertsModal,
      getRuleHelpers,
    },
  } = services;

  const { euiTheme } = useEuiTheme();

  const collapsedItemActionsCss = css`
    .collapsedItemActions__deleteButton {
      color: ${euiTheme.colors.textDanger};
    }
  `;

  const [isRuleEditPopoverOpen, setIsRuleEditPopoverOpen] = useState(false);
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [isUntrackAlertsModalOpen, setIsUntrackAlertsModalOpen] = useState(false);

  const { mutate: enableRule } = useEnableRule();
  const { mutate: disableRule } = useDisableRule();
  const { mutate: runRule } = useRunRule();
  const { mutate: updateAPIKey } = useUpdateAPIKey();

  const { linkUrl, buttonText } = useAppLink({ rule });

  const onDisableModalClose = useCallback(() => {
    setIsUntrackAlertsModalOpen(false);
  }, []);

  const onDisableModalOpen = useCallback(() => {
    setIsUntrackAlertsModalOpen(true);
  }, []);

  const togglePopover = useCallback(() => {
    setIsRuleEditPopoverOpen((open) => !open);
  }, []);

  const handleEditRule = useCallback(() => {
    setIsRuleEditPopoverOpen(false);
    onEditRule();
  }, [onEditRule]);

  const handleRemoveRule = useCallback(() => {
    setIsRuleEditPopoverOpen(false);
    onDeleteRule();
  }, [onDeleteRule]);

  const handleRunRule = useCallback(() => {
    setIsRuleEditPopoverOpen(false);
    runRule({ id: ruleId });
  }, [runRule, ruleId]);

  const handleUpdateAPIKey = useCallback(() => {
    setIsRuleEditPopoverOpen(false);
    updateAPIKey({ id: ruleId });
  }, [updateAPIKey, ruleId]);

  const handleEnableRule = useCallback(() => {
    setIsRuleEditPopoverOpen(false);
    enableRule({ id: ruleId });
  }, [enableRule, ruleId]);

  const handleDisableRule = useCallback(
    (untrack: boolean) => {
      setIsRuleEditPopoverOpen(false);
      onDisableModalClose();
      disableRule({
        id: ruleId,
        untrack,
      });
    },
    [disableRule, ruleId, onDisableModalClose]
  );

  const getChromeBarV2Fragment = useCallback((): Pick<
    AppMenuConfig,
    'layout' | 'primaryActionItem' | 'secondaryActionItem' | 'overflowOnlyItems'
  > => {
    if (!isRuleEditable || !rule) {
      return {};
    }

    const snoozeIconType = getRuleHelpers(rule).isRuleSnoozed ? 'bellSlash' : 'bell';

    const overflowOnlyItems: AppMenuItemType[] = [];
    let order = 1;

    overflowOnlyItems.push(
      rule.enabled
        ? {
            order: order++,
            id: 'observability-rule-detail-disable',
            label: i18n.translate('xpack.observability.ruleDetails.disableRule', {
              defaultMessage: 'Disable',
            }),
            iconType: 'stopFilled',
            testId: 'disableRuleButton',
            run: onDisableModalOpen,
          }
        : {
            order: order++,
            id: 'observability-rule-detail-enable',
            label: i18n.translate('xpack.observability.ruleDetails.enableRule', {
              defaultMessage: 'Enable',
            }),
            iconType: 'play',
            testId: 'enableRuleButton',
            run: handleEnableRule,
          }
    );

    overflowOnlyItems.push({
      order: order++,
      id: 'observability-rule-detail-run',
      label: i18n.translate('xpack.observability.ruleDetails.runRule', {
        defaultMessage: 'Run',
      }),
      iconType: 'play',
      testId: 'runRuleButton',
      run: handleRunRule,
    });

    overflowOnlyItems.push({
      order: order++,
      id: 'observability-rule-detail-update-api-key',
      label: i18n.translate('xpack.observability.ruleDetails.updateAPIkey', {
        defaultMessage: 'Update API key',
      }),
      iconType: 'key',
      testId: 'updateAPIKeyButton',
      run: handleUpdateAPIKey,
    });

    if (linkUrl) {
      overflowOnlyItems.push({
        order: order++,
        id: 'observability-rule-detail-view-linked',
        label: buttonText,
        iconType: 'eye',
        href: linkUrl,
        target: '_self',
        testId: 'ruleViewLinkedObjectButton',
        run: () => {
          void application.navigateToUrl(linkUrl);
        },
      });
    }

    overflowOnlyItems.push({
      order: order++,
      id: 'observability-rule-detail-delete',
      label: i18n.translate('xpack.observability.ruleDetails.deleteRule', {
        defaultMessage: 'Delete',
      }),
      iconType: 'trash',
      testId: 'deleteRuleButton',
      run: handleRemoveRule,
    });

    return {
      layout: 'chromeBarV2',
      primaryActionItem: {
        id: 'observability-rule-detail-edit',
        label: i18n.translate('xpack.observability.ruleDetails.editRule', {
          defaultMessage: 'Edit',
        }),
        iconType: 'pencil',
        testId: 'editRuleButton',
        disableButton: isLoading,
        run: () => {
          handleEditRule();
        },
      },
      secondaryActionItem: {
        id: 'observability-rule-detail-snooze',
        label: i18n.translate('xpack.observability.ruleDetails.snoozeMenuLabel', {
          defaultMessage: 'Snooze',
        }),
        iconType: snoozeIconType,
        testId: 'snoozeRuleButton',
        disableButton: isLoading,
        tooltipContent: i18n.translate('xpack.observability.ruleDetails.snoozeButtonAriaLabel', {
          defaultMessage: 'Manage rule snooze',
        }),
        run: () => {
          setSnoozeModalOpen(true);
        },
      },
      overflowOnlyItems,
    };
  }, [
    isRuleEditable,
    rule,
    isLoading,
    linkUrl,
    buttonText,
    application,
    onDisableModalOpen,
    handleEnableRule,
    handleRunRule,
    handleUpdateAPIKey,
    handleRemoveRule,
    handleEditRule,
    getRuleHelpers,
  ]);

  const modals = useMemo(
    () => (
      <>
        {snoozeModalOpen && rule ? (
          <RuleSnoozeModal
            rule={rule}
            onClose={() => {
              setSnoozeModalOpen(false);
              setIsRuleEditPopoverOpen(false);
            }}
            onRuleChanged={refetch}
            onLoading={noop}
          />
        ) : null}

        {isUntrackAlertsModalOpen ? (
          <UntrackAlertsModal onCancel={onDisableModalClose} onConfirm={handleDisableRule} />
        ) : null}
      </>
    ),
    [snoozeModalOpen, rule, refetch, isUntrackAlertsModalOpen, onDisableModalClose, handleDisableRule]
  );

  const renderClassicHeaderActions = useCallback(() => {
    if (!isRuleEditable || !rule) {
      return null;
    }

    const disableRuleOption = {
      'data-test-subj': 'disableRuleButton',
      onClick: onDisableModalOpen,
      name: i18n.translate('xpack.observability.ruleDetails.disableRule', {
        defaultMessage: 'Disable',
      }),
    };

    const enableRuleOption = {
      'data-test-subj': 'enableRuleButton',
      onClick: handleEnableRule,
      name: i18n.translate('xpack.observability.ruleDetails.enableRule', {
        defaultMessage: 'Enable',
      }),
    };

    const panels = [
      {
        id: 0,
        hasFocus: false,
        items: [
          ...[rule.enabled ? disableRuleOption : enableRuleOption],
          {
            'data-test-subj': 'runRuleButton',
            onClick: handleRunRule,
            name: i18n.translate('xpack.observability.ruleDetails.runRule', {
              defaultMessage: 'Run',
            }),
          },
          {
            'data-test-subj': 'updateAPIKeyButton',
            onClick: handleUpdateAPIKey,
            name: i18n.translate('xpack.observability.ruleDetails.updateAPIkey', {
              defaultMessage: 'Update API key',
            }),
          },
          {
            isSeparator: true as const,
          },
          {
            icon: 'pencil',
            'data-test-subj': 'editRuleButton',
            onClick: handleEditRule,
            name: i18n.translate('xpack.observability.ruleDetails.editRule', {
              defaultMessage: 'Edit',
            }),
          },
          {
            icon: 'trash',
            'data-test-subj': 'deleteRuleButton',
            className: 'collapsedItemActions__deleteButton',
            onClick: handleRemoveRule,
            name: i18n.translate('xpack.observability.ruleDetails.deleteRule', {
              defaultMessage: 'Delete',
            }),
          },
        ],
      },
    ];

    return (
      <EuiFlexGroup
        direction="rowReverse"
        alignItems="center"
        data-test-subj={`ruleType_${rule.ruleTypeId}`}
      >
        <EuiFlexItem>
          <EuiPopover
            id="contextRuleEditMenu"
            panelPaddingSize="none"
            isOpen={isRuleEditPopoverOpen}
            closePopover={togglePopover}
            button={
              <EuiButton
                data-test-subj="actions"
                disabled={isLoading}
                fill
                iconSide="right"
                iconType="arrowDown"
                onClick={togglePopover}
              >
                {i18n.translate('xpack.observability.ruleDetails.actionsButtonLabel', {
                  defaultMessage: 'Actions',
                })}
              </EuiButton>
            }
          >
            <EuiContextMenu
              initialPanelId={0}
              panels={panels}
              className="actDetailsCollapsedItemActions"
              data-test-subj="detailsCollapsedActionPanel"
              data-testid="detailsCollapsedActionPanel"
              css={collapsedItemActionsCss}
            />
          </EuiPopover>
        </EuiFlexItem>
        {linkUrl ? (
          <EuiFlexItem grow={false} data-test-subj="ruleSidebarViewInAppAction">
            <EuiButtonEmpty
              color="primary"
              href={linkUrl}
              data-test-subj="ruleViewLinkedObjectButton"
              iconType="eye"
              aria-label={buttonText}
            >
              {buttonText}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={1}>
          <EuiButtonIcon
            className="snoozeButton"
            data-test-subj="snoozeRuleButton"
            iconType={getRuleHelpers(rule).isRuleSnoozed ? 'bellSlash' : 'bell'}
            onClick={() => {
              setSnoozeModalOpen(true);
            }}
            aria-label={i18n.translate('xpack.observability.ruleDetails.snoozeButtonAriaLabel', {
              defaultMessage: 'Manage rule snooze',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [
    isRuleEditable,
    rule,
    isLoading,
    linkUrl,
    buttonText,
    isRuleEditPopoverOpen,
    togglePopover,
    onDisableModalOpen,
    handleEnableRule,
    handleRunRule,
    handleUpdateAPIKey,
    handleEditRule,
    handleRemoveRule,
    getRuleHelpers,
    collapsedItemActionsCss,
  ]);

  const showClassicHeaderActions = Boolean(isRuleEditable && rule);

  return {
    showClassicHeaderActions,
    modals,
    renderClassicHeaderActions,
    getChromeBarV2Fragment,
  };
}
