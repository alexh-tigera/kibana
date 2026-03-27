/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { PLUGIN } from '../../../../../../common/constants/plugin';

export const useOverviewBreadcrumbs = () => {
  const kibana = useKibana();
  const appPath = kibana.services.application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? '';

  useBreadcrumbs([
    {
      text: MONITORS_BREADCRUMB,
      href: `${appPath}`,
    },
  ]);
};

/** Last crumb on the Synthetics Overview route; drives project chrome title and the breadcrumb trail. */
export const MONITORS_BREADCRUMB = i18n.translate('xpack.synthetics.breadcrumbs.monitorsCrumb', {
  defaultMessage: 'Monitors',
});
