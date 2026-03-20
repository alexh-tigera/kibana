/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { KibanaDataView, SourcererModel } from '../../sourcerer/store/model';
import { initDataView } from '../../sourcerer/store/model';
import { initializeSecuritySolution } from '../../common/components/initialization/api';
import { hasAccessToSecuritySolution } from '../../helpers_access';

interface DataViewPayload {
  id: string;
  title: string;
  patternList: string[];
}

interface SourcecererDataViewsPayload {
  defaultDataView: DataViewPayload;
  alertDataView: DataViewPayload;
  attackDataView?: DataViewPayload;
  kibanaDataViews: DataViewPayload[];
  signalIndexName: string;
}

export interface CreateDefaultDataViewDependencies {
  http: CoreStart['http'];
  application: CoreStart['application'];
  skip?: boolean;
}

export const createDefaultDataView = async ({
  http,
  application,
  skip = false,
}: CreateDefaultDataViewDependencies) => {
  let defaultDataView: SourcererModel['defaultDataView'];
  let alertDataView: SourcererModel['alertDataView'];
  let attackDataView: SourcererModel['attackDataView'];
  let kibanaDataViews: SourcererModel['kibanaDataViews'];

  const signal: { name: string | null; index_mapping_outdated: null | boolean } = {
    index_mapping_outdated: null,
    name: null,
  };

  if (skip) {
    return {
      alertDataView: { ...initDataView },
      attackDataView: { ...initDataView },
      defaultDataView: { ...initDataView },
      kibanaDataViews: [],
      signal,
    };
  }

  try {
    if (!hasAccessToSecuritySolution(application.capabilities)) {
      throw new Error('No access to Security Solution');
    }

    const response = await initializeSecuritySolution({
      flows: ['sourcerer-data-views'],
      http,
    });

    const flowResult = response.flows['sourcerer-data-views'];

    if (!flowResult || flowResult.status !== 'ready' || !flowResult.payload) {
      throw new Error(flowResult?.error ?? 'Failed to initialize sourcerer data views');
    }

    const payload = flowResult.payload as unknown as SourcecererDataViewsPayload;

    defaultDataView = { ...initDataView, ...payload.defaultDataView };
    alertDataView = { ...initDataView, ...payload.alertDataView };
    attackDataView = payload.attackDataView
      ? { ...initDataView, ...payload.attackDataView }
      : { ...initDataView };
    kibanaDataViews = payload.kibanaDataViews.map((dataView: KibanaDataView) => ({
      ...initDataView,
      ...dataView,
    }));
    signal.name = payload.signalIndexName;
  } catch (error) {
    defaultDataView = { ...initDataView, error };
    alertDataView = { ...initDataView, error };
    attackDataView = { ...initDataView, error };
    kibanaDataViews = [];
  }

  return { alertDataView, attackDataView, defaultDataView, kibanaDataViews, signal };
};
