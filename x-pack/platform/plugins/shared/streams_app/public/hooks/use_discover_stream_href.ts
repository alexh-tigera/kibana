/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { Streams, getDiscoverEsqlQuery } from '@kbn/streams-schema';
import type { IndicesIndexMode } from '@elastic/elasticsearch/lib/api/types';
import { useKibana } from './use_kibana';
import { useStreamsPrivileges } from './use_streams_privileges';

/**
 * Discover URL for opening a stream in Discover (same rules as DiscoverBadgeButton).
 */
export function useDiscoverStreamHref({
  stream,
  hasDataStream = false,
  indexMode,
}: {
  stream: Streams.WiredStream.Definition | Streams.ClassicStream.Definition | Streams.QueryStream.Definition;
  hasDataStream?: boolean;
  indexMode?: IndicesIndexMode;
}): string | undefined {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const isIngestStream = !Streams.QueryStream.Definition.is(stream);
  const { features } = useStreamsPrivileges();
  const esqlQuery = getDiscoverEsqlQuery({
    definition: stream,
    indexMode: isIngestStream ? indexMode : undefined,
    includeMetadata: Streams.WiredStream.Definition.is(stream),
    useViews: features.wiredStreamViews.enabled,
  });
  const useUrl = share.url.locators.useUrl;

  const discoverLink = useUrl<DiscoverAppLocatorParams>(
    () => ({
      id: DISCOVER_APP_LOCATOR,
      params: {
        query: { esql: esqlQuery || '' },
      },
    }),
    [esqlQuery]
  );

  if (!discoverLink || !hasDataStream || !esqlQuery) {
    return undefined;
  }

  return discoverLink;
}
