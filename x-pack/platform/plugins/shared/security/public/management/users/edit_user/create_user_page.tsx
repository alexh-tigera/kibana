/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';

import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { UserForm } from './user_form';
import { useCapabilities } from '../../../components/use_capabilities';

export const CreateUserPage: FunctionComponent = () => {
  const { services } = useKibana();
  const history = useHistory();
  const readOnly = !useCapabilities('users').save;
  const backToUsers = () => history.push('/');

  const chromeStyle = useObservable(
    services.chrome.getChromeStyle$(),
    services.chrome.getChromeStyle()
  );
  const isProjectChrome = chromeStyle === 'project';

  useEffect(() => {
    if (readOnly) {
      backToUsers();
    }
  }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {!isProjectChrome ? (
        <>
          <EuiPageHeader
            bottomBorder
            pageTitle={
              <FormattedMessage
                id="xpack.security.management.users.createUserPage.title"
                defaultMessage="Create user"
              />
            }
          />

          <EuiSpacer size="l" />
        </>
      ) : null}

      <UserForm isNewUser onCancel={backToUsers} onSuccess={backToUsers} />
    </>
  );
};
