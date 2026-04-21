/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical `entity.namespace` value for non-IDP local user identity
 * (`userEntityDefinition` ranking branch, fieldEvaluations, streamlang conditions).
 */
export const USER_ENTITY_NAMESPACE = {
  Local: 'local',
} as const;

export type UserEntityLocalNamespace =
  (typeof USER_ENTITY_NAMESPACE)[keyof typeof USER_ENTITY_NAMESPACE];

/** User names excluded from local namespace (system/service accounts). Used by `userEntityDefinition` non-IDP filters. */
export const LOCAL_NAMESPACE_EXCLUDED_USER_NAMES = [
  // Linux built-in / service accounts
  'root',
  'bin',
  'daemon',
  'sys',
  'nobody',
  'syslog',
  'man',
  'sshd',
  '_apt',
  'messagebus',
  '_chrony',
  'systemd-resolve',

  // CI / automation service accounts
  'jenkins',
  'ansible',
  'deploy',
  'terraform',
  'gitlab-runner',

  // Database / middleware service accounts
  'postgres',
  'mysql',
  'redis',
  'elasticsearch',
  'kafka',

  // Generic service / operator accounts
  'admin',
  'operator',
  'service',

  // Windows built-in accounts (uppercase; case-sensitive matching requires separate entries from the lowercase equivalents above)
  'ADMIN',
  'ADMINISTRATOR',
  'SYSTEM',
  'ROOT',
  'ANONYMOUS',
  'AUTHENTICATED USER',
  'NETWORK',
  'NULL',
  'LOCAL SYSTEM',
  'LOCALSYSTEM',
  'NETWORK SERVICE',
] as const;

/** Allowed values for `entity.confidence` (user after-stats overrides and extracted metadata). */
export const ENTITY_CONFIDENCE = {
  High: 'high',
  Medium: 'medium',
} as const;

export type EntityConfidence = (typeof ENTITY_CONFIDENCE)[keyof typeof ENTITY_CONFIDENCE];
