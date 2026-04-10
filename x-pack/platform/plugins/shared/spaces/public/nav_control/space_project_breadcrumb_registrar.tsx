/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import React, { useEffect, useState } from 'react';

import type { ApplicationStart, Capabilities, CoreStart } from '@kbn/core/public';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { SpacesMenu } from './components/spaces_menu';
import { useSpaces } from './hooks/use_spaces';
import type { Space } from '../../common';
import type { EventTracker } from '../analytics';
import type { SpacesManager } from '../spaces_manager';

/** Matches `data-test-subj` on the raw chrome breadcrumb (before `prepareBreadcrumbs`). */
export const SPACES_PROJECT_BREADCRUMB_TEST_SUBJ = 'spacesNavBreadcrumb';

const popoutContentId = 'headerSpacesMenuBreadcrumbContent';

export interface SpaceProjectBreadcrumbRegistrarProps {
  core: CoreStart;
  spacesManager: SpacesManager;
  serverBasePath: string;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  allowSolutionVisibility: boolean;
  eventTracker: EventTracker;
}

export function SpaceProjectBreadcrumbRegistrar({
  core,
  spacesManager,
  serverBasePath,
  capabilities,
  navigateToApp,
  navigateToUrl,
  allowSolutionVisibility,
  eventTracker,
}: SpaceProjectBreadcrumbRegistrarProps) {
  const { euiTheme } = useEuiTheme();
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const { data, isLoading } = useSpaces(spacesManager);
  const chrome = core.chrome as InternalChromeStart;

  useEffect(() => {
    const sub = spacesManager.onActiveSpaceChange$.subscribe(setActiveSpace);
    return () => sub.unsubscribe();
  }, [spacesManager]);

  useEffect(() => {
    if (!activeSpace) {
      chrome.project.setSpaceSwitcherBreadcrumb(undefined);
      return () => {
        chrome.project.setSpaceSwitcherBreadcrumb(undefined);
      };
    }

    chrome.project.setSpaceSwitcherBreadcrumb({
      text: activeSpace.name,
      'data-test-subj': SPACES_PROJECT_BREADCRUMB_TEST_SUBJ,
      popoverContent: (closePopover) => (
        <SpacesMenu
          id={popoutContentId}
          spaces={data || []}
          serverBasePath={serverBasePath}
          toggleSpaceSelector={closePopover}
          capabilities={capabilities}
          navigateToApp={navigateToApp}
          navigateToUrl={navigateToUrl}
          activeSpace={activeSpace}
          allowSolutionVisibility={allowSolutionVisibility}
          eventTracker={eventTracker}
          onClickManageSpaceBtn={closePopover}
          isLoading={isLoading}
        />
      ),
      popoverProps: {
        panelPaddingSize: 'none',
        zIndex: Number(euiTheme.levels.navigation) + 1,
               panelProps: {
          'data-test-subj': 'spaceMenuPopoverPanel',
        },
      },
    });

    return () => {
      chrome.project.setSpaceSwitcherBreadcrumb(undefined);
    };
  }, [
    activeSpace,
    allowSolutionVisibility,
    capabilities,
    chrome.project,
    data,
    eventTracker,
    isLoading,
    navigateToApp,
    navigateToUrl,
    serverBasePath,
    euiTheme.levels.navigation,
  ]);

  return null;
}
