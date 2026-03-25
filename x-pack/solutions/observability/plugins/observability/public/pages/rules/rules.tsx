/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type {
  AppMenuConfig,
  AppMenuHeaderTab,
  AppMenuItemType,
  AppMenuSecondaryActionItem,
} from '@kbn/core-chrome-app-menu-components';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { RuleTypeModal } from '@kbn/response-ops-rule-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useHistory } from 'react-router-dom';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared/src/common/hooks';
import { RULES_LOGS_PATH, RULES_PATH, paths } from '../../../common/locators/paths';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import { RulesTab } from './rules_tab';
import { useGetAvailableRulesWithDescriptions } from '../../hooks/use_get_available_rules_with_descriptions';

const GlobalLogsTab = lazy(() => import('./global_logs_tab'));

const RulesSettingsFlyoutLazy = lazy(async () => {
  const { RulesSettingsFlyout } = await import('@kbn/triggers-actions-ui-plugin/public');
  return { default: RulesSettingsFlyout };
});

const rulesSettingsQueryClient = new QueryClient();

const RULES_TAB_NAME = 'rules';

interface RulesPageProps {
  activeTab?: string;
}
export function RulesPage({ activeTab = RULES_TAB_NAME }: RulesPageProps) {
  const { services } = useKibana();
  const {
    http,
    docLinks,
    notifications: { toasts },
    observabilityAIAssistant,
    application,
    chrome,
    share,
    triggersActionsUi: { ruleTypeRegistry },
    serverless,
  } = services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();
  const [ruleTypeModalVisibility, setRuleTypeModalVisibility] = useState<boolean>(false);
  const [isRulesSettingsFlyoutVisible, setIsRulesSettingsFlyoutVisible] = useState(false);
  const [stateRefresh, setRefresh] = useState(new Date());

  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const addDataHref = onboardingLocator?.useUrl({});

  const {
    rulesSettings: {
      show: showRulesSettingsCapability = false,
      readFlappingSettingsUI = false,
      readQueryDelaySettingsUI = false,
    } = {},
  } = application.capabilities;

  const showRulesSettingsInChrome =
    showRulesSettingsCapability && (readFlappingSettingsUI || readQueryDelaySettingsUI);

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
          defaultMessage: 'Alerts',
        }),
        href: http.basePath.prepend('/app/observability/alerts'),
        deepLinkId: 'observability-overview:alerts',
      },
      {
        text: i18n.translate('xpack.observability.breadcrumbs.rulesLinkText', {
          defaultMessage: 'Rules',
        }),
      },
    ],
    { serverless }
  );

  const filteredRuleTypes = useGetFilteredRuleTypes();
  const { authorizedToCreateAnyRules } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes,
  });

  const { setScreenContext } = observabilityAIAssistant?.service || {};

  const ruleTypesWithDescriptions = useGetAvailableRulesWithDescriptions();

  useEffect(() => {
    return setScreenContext?.({
      screenDescription: `The rule types that are available are: ${JSON.stringify(
        ruleTypesWithDescriptions
      )}`,
      starterPrompts: [
        {
          title: i18n.translate(
            'xpack.observability.aiAssistant.starterPrompts.explainRules.title',
            {
              defaultMessage: 'Explain',
            }
          ),
          prompt: i18n.translate(
            'xpack.observability.aiAssistant.starterPrompts.explainRules.prompt',
            {
              defaultMessage: `Can you explain the rule types that are available?`,
            }
          ),
          icon: 'sparkles',
        },
      ],
    });
  }, [filteredRuleTypes, ruleTypesWithDescriptions, setScreenContext]);

  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const rulesAppMenuHeaderTabs = useMemo((): AppMenuHeaderTab[] => {
    return [
      {
        id: 'rules',
        label: (
          <FormattedMessage
            id="xpack.observability.rulePage.rulesTabTitle"
            defaultMessage="Rules"
          />
        ),
        isSelected: activeTab === RULES_TAB_NAME,
        onClick: () => history.push(RULES_PATH),
      },
      {
        id: 'logs',
        label: (
          <FormattedMessage id="xpack.observability.rulePage.logsTabTitle" defaultMessage="Logs" />
        ),
        isSelected: activeTab !== RULES_TAB_NAME,
        onClick: () => history.push(RULES_LOGS_PATH),
        testId: 'ruleLogsTab',
      },
    ];
  }, [activeTab, history]);

  const rulesAppMenuConfig = useMemo((): AppMenuConfig => {
    const createRuleLabel = i18n.translate('xpack.observability.rules.addRuleButtonLabel', {
      defaultMessage: 'Create rule',
    });
    const addDataLabel = i18n.translate('xpack.observability.home.addData', {
      defaultMessage: 'Add data',
    });

    const config: AppMenuConfig = {
      layout: 'chromeBarV2',
      primaryActionItem: {
        id: 'observability-rules-create-rule',
        label: createRuleLabel,
        iconType: 'plusInCircle',
        testId: 'createRuleButton',
        disableButton: !authorizedToCreateAnyRules,
        run: () => {
          setRuleTypeModalVisibility(true);
        },
      },
    };

    const overflowOnlyItems: AppMenuItemType[] = [];
    let overflowOrder = 1;

    if (addDataHref) {
      overflowOnlyItems.push({
        order: overflowOrder++,
        id: 'observability-rules-add-data',
        label: addDataLabel,
        iconType: 'indexOpen',
        href: addDataHref,
        run: () => {
          void application.navigateToUrl(addDataHref);
        },
      });
    }

    const rulesDocumentationHref = docLinks.links.observability.createAlerts;
    overflowOnlyItems.push({
      order: overflowOrder,
      id: 'observability-rules-documentation',
      label: i18n.translate('xpack.observability.rules.docsLinkText', {
        defaultMessage: 'Documentation',
      }),
      iconType: 'documentation',
      testId: 'documentationLink',
      href: rulesDocumentationHref,
      target: '_blank',
    });

    if (showRulesSettingsInChrome) {
      const settingsSecondary: AppMenuSecondaryActionItem = {
        id: 'observability-rules-settings',
        label: i18n.translate('xpack.triggersActionsUI.rulesSettings.link.title', {
          defaultMessage: 'Settings',
        }),
        iconType: 'gear',
        testId: 'rulesSettingsLink',
        isFilled: false,
        run: () => {
          setIsRulesSettingsFlyoutVisible(true);
        },
      };
      config.secondaryActionItems = [settingsSecondary];
    }

    config.overflowOnlyItems = overflowOnlyItems;
    config.headerTabs = rulesAppMenuHeaderTabs;

    return config;
  }, [
    addDataHref,
    application,
    authorizedToCreateAnyRules,
    docLinks.links.observability.createAlerts,
    rulesAppMenuHeaderTabs,
    showRulesSettingsInChrome,
  ]);

  const tabs = useMemo(
    () =>
      rulesAppMenuHeaderTabs.map((tab) => ({
        name: tab.id,
        label: tab.label,
        onClick: tab.onClick,
        isSelected: tab.isSelected,
        ...(tab.testId ? { 'data-test-subj': tab.testId } : {}),
      })),
    [rulesAppMenuHeaderTabs]
  );

  const rightSideItems = [
    <EuiButtonEmpty
      data-test-subj="documentationLink"
      href={docLinks.links.observability.createAlerts}
      iconType="question"
      key="documentation"
      target="_blank"
    >
      <FormattedMessage
        id="xpack.observability.rules.docsLinkText"
        defaultMessage="Documentation"
      />
    </EuiButtonEmpty>,
  ];

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.rulesTitle', {
          defaultMessage: 'Rules',
        }),
        ...(isProjectChrome
          ? {}
          : {
              rightSideItems,
              tabs,
            }),
      }}
      data-test-subj="rulesPage"
    >
      <AppMenu config={rulesAppMenuConfig} setAppMenu={chrome.setAppMenu} />
      {showRulesSettingsInChrome ? (
        <QueryClientProvider client={rulesSettingsQueryClient}>
          <Suspense fallback={<EuiLoadingSpinner />}>
            <RulesSettingsFlyoutLazy
              isVisible={isRulesSettingsFlyoutVisible}
              onClose={() => setIsRulesSettingsFlyoutVisible(false)}
            />
          </Suspense>
        </QueryClientProvider>
      ) : null}
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          {activeTab === RULES_TAB_NAME ? (
            <RulesTab setRefresh={setRefresh} stateRefresh={stateRefresh} />
          ) : (
            <GlobalLogsTab />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {ruleTypeModalVisibility && (
        <RuleTypeModal
          onClose={() => setRuleTypeModalVisibility(false)}
          onSelectRuleType={(ruleTypeId) => {
            setRuleTypeModalVisibility(false);
            return application.navigateToUrl(
              http.basePath.prepend(paths.observability.createRule(ruleTypeId))
            );
          }}
          onSelectTemplate={(templateId) => {
            setRuleTypeModalVisibility(false);
            return application.navigateToUrl(
              http.basePath.prepend(paths.observability.createRuleFromTemplate(templateId))
            );
          }}
          http={http}
          toasts={toasts}
          registeredRuleTypes={ruleTypeRegistry.list()}
          filteredRuleTypes={filteredRuleTypes}
        />
      )}
    </ObservabilityPageTemplate>
  );
}
