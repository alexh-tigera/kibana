/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { HistorySnapshotUpdateSchema } from './history_snapshot_validator';

const TestSchema = z.object({ historySnapshot: HistorySnapshotUpdateSchema });

describe('HistorySnapshotUpdateSchema', () => {
  it('accepts valid frequency', () => {
    expect(TestSchema.safeParse({ historySnapshot: { frequency: '24h' } }).success).toBe(true);
    expect(TestSchema.safeParse({ historySnapshot: { frequency: '2h' } }).success).toBe(true);
    expect(TestSchema.safeParse({ historySnapshot: { frequency: '1h' } }).success).toBe(true);
  });

  it('rejects frequency less than 1h', () => {
    const result = TestSchema.safeParse({ historySnapshot: { frequency: '30m' } });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => typeof i.message === 'string' && i.message.includes('1 hour')
      );
      expect(issue).toBeDefined();
    }
  });

  it('rejects invalid frequency format', () => {
    const result = TestSchema.safeParse({ historySnapshot: { frequency: 'invalid' } });
    expect(result.success).toBe(false);
  });
});
