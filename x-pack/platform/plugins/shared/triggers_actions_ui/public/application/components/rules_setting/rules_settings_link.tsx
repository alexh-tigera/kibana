/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AlertDeleteCategoryIds } from '@kbn/alerting-plugin/common/constants/alert_delete';
import { RulesSettingsFlyout } from './rules_settings_flyout';
import { useKibana } from '../../../common/lib/kibana';

export interface RuleSettingsLinkProps {
  alertDeleteCategoryIds?: AlertDeleteCategoryIds[];
  /**
   * When set with `onFlyoutVisibleChange`, flyout open state is controlled by the parent
   * (e.g. Stack Management Rules project AppMenu + header button).
   */
  flyoutVisible?: boolean;
  onFlyoutVisibleChange?: (visible: boolean) => void;
  /**
   * When false, only the flyout is rendered (opened from project chrome AppMenu).
   * Default true.
   */
  showButton?: boolean;
}
export const RulesSettingsLink = ({
  alertDeleteCategoryIds,
  flyoutVisible,
  onFlyoutVisibleChange,
  showButton = true,
}: RuleSettingsLinkProps) => {
  const [internalVisible, setInternalVisible] = useState<boolean>(false);
  const isControlled = onFlyoutVisibleChange !== undefined;
  const isVisible = isControlled ? Boolean(flyoutVisible) : internalVisible;
  const setVisible = (next: boolean) => {
    if (isControlled) {
      onFlyoutVisibleChange(next);
    } else {
      setInternalVisible(next);
    }
  };
  const {
    application: {
      capabilities: { rulesSettings = {} },
    },
  } = useKibana().services;

  const { show, readFlappingSettingsUI, readQueryDelaySettingsUI } = rulesSettings;

  if (!show || (!readFlappingSettingsUI && !readQueryDelaySettingsUI)) {
    return null;
  }

  return (
    <>
      {showButton ? (
        <EuiButtonEmpty
          onClick={() => setVisible(true)}
          iconType="gear"
          data-test-subj="rulesSettingsLink"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.link.title"
            defaultMessage="Settings"
          />
        </EuiButtonEmpty>
      ) : null}
      <RulesSettingsFlyout
        isVisible={isVisible}
        onClose={() => setVisible(false)}
        alertDeleteCategoryIds={alertDeleteCategoryIds}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { RulesSettingsLink as default };
