/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { getSurveyFeedbackURL } from '@kbn/observability-shared-plugin/public';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useActionModal } from '../../../context/action_modal';
import { useFetchRulesForSlo } from '../../../hooks/use_fetch_rules_for_slo';
import { useKibana } from '../../../hooks/use_kibana';
import { usePermissions } from '../../../hooks/use_permissions';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { convertSliApmParamsToApmAppDeeplinkUrl } from '../../../utils/slo/convert_sli_apm_params_to_apm_app_deeplink_url';
import { isApmIndicatorType } from '../../../utils/slo/indicator';
import { EditBurnRateRuleFlyout } from '../../slos/components/common/edit_burn_rate_rule_flyout';
import { useGetQueryParams } from './use_get_query_params';
import { useSloActions } from './use_slo_actions';

const SLO_FEEDBACK_FORM_URL = 'https://ela.st/slo-feedback';

const NOT_AVAILABLE_FOR_REMOTE = i18n.translate('xpack.slo.item.actions.notAvailable', {
  defaultMessage: 'This action is not available for remote SLOs',
});

const NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL = i18n.translate(
  'xpack.slo.item.actions.remoteKibanaUrlUndefined',
  {
    defaultMessage: 'This action is not available for remote SLOs with undefined kibanaUrl',
  }
);

export interface UseSloDetailsHeaderActionsParams {
  slo?: SLOWithSummaryResponse;
}

export interface SloDetailsHeaderActionsApi {
  classicActionsPopover: React.ReactNode;
  modalsAndFlyouts: React.ReactNode;
  getChromeBarV2Fragment: (opts: {
    isAutoRefreshing: boolean;
    onToggleAutoRefresh: () => void;
  }) => Pick<
    AppMenuConfig,
    'layout' | 'primaryActionItem' | 'secondaryActionItem' | 'overflowOnlyItems'
  >;
}

export function useSloDetailsHeaderActions({
  slo,
}: UseSloDetailsHeaderActionsParams): SloDetailsHeaderActionsApi {
  const { services } = useKibana();
  const {
    application: { navigateToUrl, capabilities },
    http: { basePath },
    docLinks,
    notifications,
    cloud,
    kibanaVersion,
  } = services;

  const ruleTypeRegistry = services.triggersActionsUi?.ruleTypeRegistry;
  const actionTypeRegistry = services.triggersActionsUi?.actionTypeRegistry;

  const { isServerless } = usePluginContext();
  const { pathname } = useLocation();

  const hasApmReadCapabilities = capabilities.apm?.show ?? false;
  const { data: permissions } = usePermissions();
  const { triggerAction } = useActionModal();

  const isFeedbackEnabled = notifications?.feedback?.isEnabled() ?? true;

  const {
    isDeletingSlo,
    isResettingSlo,
    isEnablingSlo,
    isDisablingSlo,
    removeDeleteQueryParam,
    removeResetQueryParam,
    removeEnableQueryParam,
    removeDisableQueryParam,
  } = useGetQueryParams();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRuleFlyoutVisible, setRuleFlyoutVisibility] = useState<boolean>(false);
  const [isEditRuleFlyoutOpen, setIsEditRuleFlyoutOpen] = useState(false);

  const { data: rulesBySlo, refetchRules } = useFetchRulesForSlo({
    sloIds: slo ? [slo.id] : [],
  });

  const rules = slo ? rulesBySlo?.[slo.id] ?? [] : [];

  const handleActionsClick = () => setIsPopoverOpen((value) => !value);
  const closePopover = () => setIsPopoverOpen(false);

  const navigate = useCallback(
    (url: string) => setTimeout(() => navigateToUrl(url)),
    [navigateToUrl]
  );

  useEffect(() => {
    if (!slo) {
      return;
    }
    if (isDeletingSlo) {
      triggerAction({
        type: 'delete',
        item: slo,
        onConfirm: () => {
          navigate(basePath.prepend(paths.slos));
        },
      });
      removeDeleteQueryParam();
    }
    if (isResettingSlo) {
      triggerAction({ type: 'reset', item: slo });
      removeResetQueryParam();
    }
    if (isEnablingSlo) {
      triggerAction({ type: 'enable', item: slo });
      removeEnableQueryParam();
    }
    if (isDisablingSlo) {
      triggerAction({ type: 'disable', item: slo });
      removeDisableQueryParam();
    }
  });

  const onCloseRuleFlyout = () => {
    setRuleFlyoutVisibility(false);
  };

  const handleOpenRuleFlyout = useCallback(() => {
    if (!ruleTypeRegistry || !actionTypeRegistry) {
      return;
    }
    closePopover();
    setRuleFlyoutVisibility(true);
  }, [ruleTypeRegistry, actionTypeRegistry]);

  const {
    handleNavigateToRules,
    sloEditUrl,
    remoteDeleteUrl,
    remoteResetUrl,
    remoteEnableUrl,
    remoteDisableUrl,
  } = useSloActions({
    slo,
    rules,
    setIsEditRuleFlyoutOpen,
    setIsActionsPopoverOpen: setIsPopoverOpen,
  });

  const handleNavigateToApm = useCallback(() => {
    if (!slo) {
      return;
    }
    const url = convertSliApmParamsToApmAppDeeplinkUrl(slo);
    if (url) {
      navigateToUrl(basePath.prepend(url));
    }
  }, [slo, navigateToUrl, basePath]);

  const handleClone = useCallback(() => {
    if (!slo) {
      return;
    }
    triggerAction({ type: 'clone', item: slo });
  }, [slo, triggerAction]);

  const handleDelete = useCallback(() => {
    if (!slo) {
      return;
    }
    if (!!remoteDeleteUrl) {
      window.open(remoteDeleteUrl, '_blank');
    } else {
      triggerAction({
        type: 'delete',
        item: slo,
        onConfirm: () => {
          navigate(basePath.prepend(paths.slos));
          setIsPopoverOpen(false);
        },
      });
      removeDeleteQueryParam();
    }
  }, [slo, remoteDeleteUrl, triggerAction, navigate, basePath, removeDeleteQueryParam]);

  const handleReset = useCallback(() => {
    if (!slo) {
      return;
    }
    if (!!remoteResetUrl) {
      window.open(remoteResetUrl, '_blank');
    } else {
      triggerAction({
        type: 'reset',
        item: slo,
        onConfirm: () => {
          setIsPopoverOpen(false);
        },
      });
      removeResetQueryParam();
    }
  }, [slo, remoteResetUrl, triggerAction, removeResetQueryParam]);

  const handleEnable = useCallback(() => {
    if (!slo) {
      return;
    }
    if (!!remoteEnableUrl) {
      window.open(remoteEnableUrl, '_blank');
    } else {
      triggerAction({
        type: 'enable',
        item: slo,
        onConfirm: () => {
          setIsPopoverOpen(false);
        },
      });
      removeEnableQueryParam();
    }
  }, [slo, remoteEnableUrl, triggerAction, removeEnableQueryParam]);

  const handleDisable = useCallback(() => {
    if (!slo) {
      return;
    }
    if (!!remoteDisableUrl) {
      window.open(remoteDisableUrl, '_blank');
    } else {
      triggerAction({
        type: 'disable',
        item: slo,
        onConfirm: () => {
          setIsPopoverOpen(false);
        },
      });
      removeDisableQueryParam();
    }
  }, [slo, remoteDisableUrl, triggerAction, removeDisableQueryParam]);

  const isRemote = !!slo?.remote;
  const hasUndefinedRemoteKibanaUrl = !!slo?.remote && slo?.remote?.kibanaUrl === '';

  const showRemoteLinkIcon = isRemote ? (
    <EuiIcon
      type="popout"
      size="s"
      css={{
        marginLeft: '10px',
      }}
    />
  ) : null;

  const getChromeBarV2Fragment = useCallback(
    ({
      isAutoRefreshing,
      onToggleAutoRefresh,
    }: {
      isAutoRefreshing: boolean;
      onToggleAutoRefresh: () => void;
    }): Pick<
      AppMenuConfig,
      'layout' | 'primaryActionItem' | 'secondaryActionItem' | 'overflowOnlyItems'
    > => {
      if (!slo) {
        return {};
      }

      const annotationsHref = basePath.prepend('/app/observability/annotations');
      const settingsHref = basePath.prepend(paths.slosSettings);
      const managementHref = basePath.prepend(paths.slosManagement);
      const sloDocsHref = docLinks.links.observability?.slo ?? '';

      const feedbackHref = isFeedbackEnabled
        ? getSurveyFeedbackURL({
            formUrl: SLO_FEEDBACK_FORM_URL,
            kibanaVersion,
            isCloudEnv: cloud?.isCloudEnabled,
            isServerlessEnv: isServerless,
            sanitizedPath: pathname,
          })
        : '';

      const overflowOnlyItems: AppMenuItemType[] = [];
      let order = 1;

      overflowOnlyItems.push(
        {
          order: order++,
          id: 'slo-details-overflow-annotations',
          label: i18n.translate('xpack.slo.home.annotations', {
            defaultMessage: 'Annotations',
          }),
          iconType: 'editorComment',
          href: annotationsHref,
          run: () => {
            void navigateToUrl(annotationsHref);
          },
        },
        {
          order: order++,
          id: 'slo-details-overflow-manage-slos',
          label: i18n.translate('xpack.slo.home.manage', {
            defaultMessage: 'Manage SLOs',
          }),
          iconType: 'tableOfContents',
          href: managementHref,
          run: () => {
            void navigateToUrl(managementHref);
          },
        }
      );

      overflowOnlyItems.push({
        order: order++,
        id: 'slo-details-overflow-create-rule',
        label: i18n.translate('xpack.slo.sloDetails.headerControl.createBurnRateRule', {
          defaultMessage: 'Create new alert rule',
        }),
        iconType: 'bell',
        testId: 'sloDetailsHeaderControlPopoverCreateRule',
        disableButton: !permissions?.hasAllWriteRequested || isRemote,
        tooltipContent: isRemote ? NOT_AVAILABLE_FOR_REMOTE : '',
        run: () => {
          handleOpenRuleFlyout();
        },
      });

      overflowOnlyItems.push({
        order: order++,
        id: 'slo-details-overflow-manage-burn-rate',
        label: i18n.translate('xpack.slo.sloDetails.headerControl.manageRules', {
          defaultMessage: 'Manage burn rate {count, plural, one {rule} other {rules}}',
          values: { count: rules.length },
        }),
        iconType: 'gear',
        testId: 'sloDetailsHeaderControlPopoverManageRules',
        disableButton: !permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl,
        tooltipContent: hasUndefinedRemoteKibanaUrl
          ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL
          : '',
        run: () => {
          void handleNavigateToRules();
        },
      });

      if (isApmIndicatorType(slo.indicator)) {
        overflowOnlyItems.push({
          order: order++,
          id: 'slo-details-overflow-service-details',
          label: i18n.translate('xpack.slo.sloDetails.headerControl.exploreInApm', {
            defaultMessage: 'Service details',
          }),
          iconType: 'bullseye',
          testId: 'sloDetailsHeaderControlPopoverExploreInApm',
          disableButton: !hasApmReadCapabilities || isRemote,
          tooltipContent: isRemote ? NOT_AVAILABLE_FOR_REMOTE : '',
          run: handleNavigateToApm,
        });
      }

      if (slo.enabled) {
        overflowOnlyItems.push({
          order: order++,
          id: 'slo-details-overflow-disable',
          label: i18n.translate('xpack.slo.item.actions.disable', { defaultMessage: 'Disable' }),
          iconType: 'stop',
          testId: 'sloActionsDisable',
          disableButton: !permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl,
          tooltipContent: hasUndefinedRemoteKibanaUrl
            ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL
            : '',
          run: handleDisable,
        });
      } else {
        overflowOnlyItems.push({
          order: order++,
          id: 'slo-details-overflow-enable',
          label: i18n.translate('xpack.slo.item.actions.enable', { defaultMessage: 'Enable' }),
          iconType: 'play',
          testId: 'sloActionsEnable',
          disableButton: !permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl,
          tooltipContent: hasUndefinedRemoteKibanaUrl
            ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL
            : '',
          run: handleEnable,
        });
      }

      overflowOnlyItems.push(
        {
          order: order++,
          id: 'slo-details-overflow-clone',
          label: i18n.translate('xpack.slo.slo.item.actions.clone', {
            defaultMessage: 'Clone',
          }),
          iconType: 'copy',
          testId: 'sloDetailsHeaderControlPopoverClone',
          disableButton: !permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl,
          tooltipContent: hasUndefinedRemoteKibanaUrl
            ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL
            : '',
          run: handleClone,
        },
        {
          order: order++,
          id: 'slo-details-overflow-reset',
          label: i18n.translate('xpack.slo.slo.item.actions.reset', {
            defaultMessage: 'Reset',
          }),
          iconType: 'refresh',
          testId: 'sloDetailsHeaderControlPopoverReset',
          disableButton: !permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl,
          tooltipContent: hasUndefinedRemoteKibanaUrl
            ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL
            : '',
          run: handleReset,
        }
      );

      overflowOnlyItems.push({
        order: order++,
        id: 'slo-details-overflow-delete',
        label: i18n.translate('xpack.slo.slo.item.actions.delete', {
          defaultMessage: 'Delete',
        }),
        iconType: 'trash',
        testId: 'sloDetailsHeaderControlPopoverDelete',
        disableButton: !permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl,
        tooltipContent: hasUndefinedRemoteKibanaUrl
          ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL
          : '',
        run: handleDelete,
      });

      overflowOnlyItems.push({
        order: order++,
        id: 'slo-details-overflow-settings',
        label: i18n.translate('xpack.slo.headerMenu.settings', {
          defaultMessage: 'Settings',
        }),
        iconType: 'gear',
        href: settingsHref,
        run: () => {
          void navigateToUrl(settingsHref);
        },
        separator: 'above',
      });

      if (isFeedbackEnabled) {
        overflowOnlyItems.push({
          order: order++,
          id: 'slo-details-overflow-feedback',
          label: i18n.translate('xpack.slo.sloDetails.overflow.feedback', {
            defaultMessage: 'Feedback',
          }),
          iconType: 'popout',
          testId: 'sloFeedbackButton',
          href: feedbackHref,
          target: '_blank',
        });
      }

      overflowOnlyItems.push({
        order: order++,
        id: 'slo-details-overflow-documentation',
        label: i18n.translate('xpack.slo.sloDetails.overflow.documentation', {
          defaultMessage: 'Documentation',
        }),
        iconType: 'documentation',
        href: sloDocsHref,
        target: '_blank',
      });

      const autoRefreshLabel = i18n.translate('xpack.slo.slosPage.autoRefreshButtonLabel', {
        defaultMessage: 'Auto-refresh',
      });
      const stopRefreshingLabel = i18n.translate('xpack.slo.slosPage.stopRefreshingButtonLabel', {
        defaultMessage: 'Stop refreshing',
      });

      return {
        layout: 'chromeBarV2',
        primaryActionItem: {
          id: 'slo-details-edit',
          label: i18n.translate('xpack.slo.sloDetails.headerControl.edit', {
            defaultMessage: 'Edit',
          }),
          iconType: 'pencil',
          testId: 'sloDetailsHeaderControlPopoverEdit',
          href: sloEditUrl,
          target: isRemote ? '_blank' : undefined,
          disableButton: !permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl,
          tooltipContent: hasUndefinedRemoteKibanaUrl
            ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL
            : '',
          run: () => {
            void navigateToUrl(sloEditUrl);
          },
        },
        secondaryActionItem: {
          id: 'slo-details-auto-refresh',
          label: isAutoRefreshing ? stopRefreshingLabel : autoRefreshLabel,
          iconType: isAutoRefreshing ? 'pause' : 'refresh',
          testId: 'autoRefreshButton',
          run: () => {
            onToggleAutoRefresh();
          },
        },
        overflowOnlyItems,
      };
    },
    [
      slo,
      basePath,
      docLinks.links.observability.slo,
      isFeedbackEnabled,
      kibanaVersion,
      cloud?.isCloudEnabled,
      isServerless,
      pathname,
      navigateToUrl,
      permissions?.hasAllWriteRequested,
      isRemote,
      hasUndefinedRemoteKibanaUrl,
      rules.length,
      hasApmReadCapabilities,
      sloEditUrl,
      handleNavigateToRules,
      handleNavigateToApm,
      handleDisable,
      handleEnable,
      handleClone,
      handleDelete,
      handleReset,
      handleOpenRuleFlyout,
    ]
  );

  const classicActionsPopover = useMemo(() => {
    if (!slo) {
      return null;
    }

    return (
      <EuiPopover
        data-test-subj="sloDetailsHeaderControlPopover"
        button={
          <EuiButton
            data-test-subj="o11yHeaderControlActionsButton"
            fill
            iconSide="right"
            iconType="arrowDown"
            iconSize="s"
            onClick={handleActionsClick}
          >
            {i18n.translate('xpack.slo.sloDetails.headerControl.actions', {
              defaultMessage: 'Actions',
            })}
          </EuiButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
      >
        <EuiContextMenuPanel
          size="m"
          items={[
            <EuiContextMenuItem
              key="edit"
              disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
              icon="pencil"
              href={sloEditUrl}
              target={isRemote ? '_blank' : undefined}
              toolTipContent={
                hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
              }
              data-test-subj="sloDetailsHeaderControlPopoverEdit"
            >
              {i18n.translate('xpack.slo.sloDetails.headerControl.edit', {
                defaultMessage: 'Edit',
              })}
              {showRemoteLinkIcon}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="createBurnRateRule"
              disabled={!permissions?.hasAllWriteRequested || isRemote}
              icon="bell"
              onClick={handleOpenRuleFlyout}
              data-test-subj="sloDetailsHeaderControlPopoverCreateRule"
              toolTipContent={isRemote ? NOT_AVAILABLE_FOR_REMOTE : ''}
            >
              {i18n.translate('xpack.slo.sloDetails.headerControl.createBurnRateRule', {
                defaultMessage: 'Create new alert rule',
              })}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="manageRules"
              disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
              icon="gear"
              onClick={handleNavigateToRules}
              data-test-subj="sloDetailsHeaderControlPopoverManageRules"
              toolTipContent={
                hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
              }
            >
              {i18n.translate('xpack.slo.sloDetails.headerControl.manageRules', {
                defaultMessage: 'Manage burn rate {count, plural, one {rule} other {rules}}',
                values: { count: rules.length },
              })}
              {showRemoteLinkIcon}
            </EuiContextMenuItem>,
          ]
            .concat(
              !!slo && isApmIndicatorType(slo.indicator) ? (
                <EuiContextMenuItem
                  key="exploreInApm"
                  icon="bullseye"
                  disabled={!hasApmReadCapabilities || isRemote}
                  onClick={handleNavigateToApm}
                  data-test-subj="sloDetailsHeaderControlPopoverExploreInApm"
                  toolTipContent={isRemote ? NOT_AVAILABLE_FOR_REMOTE : ''}
                >
                  {i18n.translate('xpack.slo.sloDetails.headerControl.exploreInApm', {
                    defaultMessage: 'Service details',
                  })}
                </EuiContextMenuItem>
              ) : (
                []
              )
            )
            .concat(
              slo.enabled ? (
                <EuiContextMenuItem
                  key="disable"
                  icon="stop"
                  disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
                  onClick={handleDisable}
                  toolTipContent={
                    hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
                  }
                  data-test-subj="sloActionsDisable"
                >
                  {i18n.translate('xpack.slo.item.actions.disable', { defaultMessage: 'Disable' })}
                  {showRemoteLinkIcon}
                </EuiContextMenuItem>
              ) : (
                <EuiContextMenuItem
                  key="enable"
                  icon="play"
                  disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
                  onClick={handleEnable}
                  toolTipContent={
                    hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
                  }
                  data-test-subj="sloActionsEnable"
                >
                  {i18n.translate('xpack.slo.item.actions.enable', { defaultMessage: 'Enable' })}
                  {showRemoteLinkIcon}
                </EuiContextMenuItem>
              ),
              <EuiContextMenuItem
                key="clone"
                disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
                icon="copy"
                onClick={handleClone}
                data-test-subj="sloDetailsHeaderControlPopoverClone"
                toolTipContent={
                  hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
                }
              >
                {i18n.translate('xpack.slo.slo.item.actions.clone', {
                  defaultMessage: 'Clone',
                })}
                {showRemoteLinkIcon}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="delete"
                icon="trash"
                disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
                onClick={handleDelete}
                data-test-subj="sloDetailsHeaderControlPopoverDelete"
                toolTipContent={
                  hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
                }
              >
                {i18n.translate('xpack.slo.slo.item.actions.delete', {
                  defaultMessage: 'Delete',
                })}
                {showRemoteLinkIcon}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="reset"
                icon="refresh"
                disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
                onClick={handleReset}
                data-test-subj="sloDetailsHeaderControlPopoverReset"
                toolTipContent={
                  hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
                }
              >
                {i18n.translate('xpack.slo.slo.item.actions.reset', {
                  defaultMessage: 'Reset',
                })}
                {showRemoteLinkIcon}
              </EuiContextMenuItem>
            )}
        />
      </EuiPopover>
    );
  }, [
    slo,
    isPopoverOpen,
    permissions?.hasAllWriteRequested,
    hasUndefinedRemoteKibanaUrl,
    sloEditUrl,
    isRemote,
    showRemoteLinkIcon,
    rules.length,
    hasApmReadCapabilities,
    handleNavigateToApm,
    handleNavigateToRules,
    handleDisable,
    handleEnable,
    handleClone,
    handleDelete,
    handleReset,
    handleOpenRuleFlyout,
  ]);

  const modalsAndFlyouts = useMemo(() => {
    if (!slo) {
      return null;
    }

    return (
      <>
        <EditBurnRateRuleFlyout
          rule={rules?.[0]}
          isEditRuleFlyoutOpen={isEditRuleFlyoutOpen}
          setIsEditRuleFlyoutOpen={setIsEditRuleFlyoutOpen}
          refetchRules={refetchRules}
        />

        {isRuleFlyoutVisible && ruleTypeRegistry && actionTypeRegistry ? (
          <RuleFormFlyout
            plugins={{ ...services, actionTypeRegistry, ruleTypeRegistry }}
            consumer={sloFeatureId}
            ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
            onCancel={onCloseRuleFlyout}
            onSubmit={onCloseRuleFlyout}
            initialValues={{ name: `${slo.name} burn rate`, params: { sloId: slo.id } }}
            shouldUseRuleProducer
          />
        ) : null}
      </>
    );
  }, [
    slo,
    rules,
    isEditRuleFlyoutOpen,
    isRuleFlyoutVisible,
    refetchRules,
    services,
    actionTypeRegistry,
    ruleTypeRegistry,
  ]);

  return {
    classicActionsPopover,
    modalsAndFlyouts,
    getChromeBarV2Fragment,
  };
}
