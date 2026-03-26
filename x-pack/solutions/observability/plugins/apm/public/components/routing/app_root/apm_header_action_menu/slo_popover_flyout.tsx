/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu, EuiHeaderLink, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import type { ApmIndicatorType } from '../../../../../common/slo_indicator_types';
import { useApmHeaderFlyouts } from '../../../../context/apm_header_flyouts/apm_header_flyouts_context';
import { useManageSlosUrl } from '../../../../hooks/use_manage_slos_url';

const sloLabel = i18n.translate('xpack.apm.home.sloMenu.slosHeaderLink', {
  defaultMessage: 'SLOs',
});

const createLatencySloLabel = i18n.translate('xpack.apm.home.sloMenu.createLatencySlo', {
  defaultMessage: 'Create APM latency SLO',
});

const createAvailabilitySloLabel = i18n.translate('xpack.apm.home.sloMenu.createAvailabilitySlo', {
  defaultMessage: 'Create APM availability SLO',
});

const manageSlosLabel = i18n.translate('xpack.apm.home.sloMenu.manageSlos', {
  defaultMessage: 'Manage SLOs',
});

interface Props {
  canReadSlos: boolean;
  canWriteSlos: boolean;
}

export function SloPopoverAndFlyout({ canReadSlos, canWriteSlos }: Props) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { openSloIndicatorType } = useApmHeaderFlyouts();

  const manageSlosUrl = useManageSlosUrl();

  const openFlyout = useCallback(
    (indicatorType: ApmIndicatorType) => {
      openSloIndicatorType(indicatorType);
      setPopoverOpen(false);
    },
    [openSloIndicatorType]
  );

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: sloLabel,
      items: [
        ...(canWriteSlos
          ? [
              {
                name: createLatencySloLabel,
                onClick: () => openFlyout('sli.apm.transactionDuration'),
                'data-test-subj': 'apmSlosMenuItemCreateLatencySlo',
              },
              {
                name: createAvailabilitySloLabel,
                onClick: () => openFlyout('sli.apm.transactionErrorRate'),
                'data-test-subj': 'apmSlosMenuItemCreateAvailabilitySlo',
              },
            ]
          : []),
        ...(canReadSlos
          ? [
              {
                name: manageSlosLabel,
                href: manageSlosUrl,
                icon: 'tableOfContents',
                'data-test-subj': 'apmSlosMenuItemManageSlos',
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <>
      <EuiPopover
        id="slos-menu"
        button={
          <EuiHeaderLink
            color="primary"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setPopoverOpen((prevState) => !prevState)}
            data-test-subj="apmSlosHeaderLink"
          >
            {sloLabel}
          </EuiHeaderLink>
        }
        isOpen={popoverOpen}
        closePopover={() => setPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </>
  );
}
