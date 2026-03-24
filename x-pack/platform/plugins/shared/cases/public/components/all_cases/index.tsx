/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import { CasesDeepLinkId } from '../../common/navigation';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { CaseCallouts } from '../callouts/case_callouts';
import { useCasesBreadcrumbs } from '../use_breadcrumbs';
import { getActionLicenseError } from '../use_push_to_service/helpers';
import { AllCasesList } from './all_cases_list';
import { CasesTableHeader } from './header';
import { useKibana } from '../../common/lib/kibana';
import { useAllCasesAppMenu } from './use_all_cases_app_menu';

export const AllCases: React.FC = () => {
  useCasesBreadcrumbs(CasesDeepLinkId.cases);

  const { docLinks, chrome } = useKibana().services;
  const { data: actionLicense = null } = useGetActionLicense();
  const actionsErrors = useMemo(
    () => getActionLicenseError(actionLicense, docLinks),
    [actionLicense, docLinks]
  );
  const appMenuConfig = useAllCasesAppMenu(actionsErrors);

  return (
    <>
      <CaseCallouts />
      <AppMenu config={appMenuConfig} setAppMenu={chrome.setAppMenu} />
      <CasesTableHeader />
      <AllCasesList />
    </>
  );
};
AllCases.displayName = 'AllCases';

// eslint-disable-next-line import/no-default-export
export { AllCases as default };
