/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { staticConnectors } from './static_connectors';
import { generateYamlSchemaFromConnectors } from '../../spec/lib/generate_yaml_schema_from_connectors';

/**
 * The static workflow Zod schema built from staticConnectors.
 * This schema validates workflows against all statically-known connector types
 * (console, elasticsearch.request, kibana.request, plus generated ES/Kibana connectors).
 */
export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(staticConnectors);
