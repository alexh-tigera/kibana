/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect } from 'react-router-dom';
import { SIEM_MIGRATIONS_RULES_PATH } from '../../common/constants';

export const SiemMigrationsManagePage = () => <Redirect to={SIEM_MIGRATIONS_RULES_PATH} />;
