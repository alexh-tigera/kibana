/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

export const journey = new Journey({
  kbnArchives: ['x-pack/performance/kbn_archives/promotion_tracking_dashboard'],
  esArchives: ['x-pack/performance/es_archives/sample_data_ecommerce_many_fields'],
  scalabilitySetup: {
    warmup: [
      {
        action: 'constantConcurrentUsers',
        userCount: 10,
        duration: '30s',
      },
      {
        action: 'rampConcurrentUsers',
        minUsersCount: 10,
        maxUsersCount: 50,
        duration: '2m',
      },
    ],
    test: [
      {
        action: 'constantConcurrentUsers',
        userCount: 50,
        duration: '5m',
      },
    ],
    maxDuration: '10m',
  },
})
  .step('Go to Dashboards Page', async ({ page, kbnUrl, kibanaPage }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await kibanaPage.waitForListViewTable();
  })

  .step('Go to Promotion Tracking Dashboard', async ({ page }) => {
    await page.click(subj('dashboardListingTitleLink-Promotion-Dashboard'));
  })

  .step('Change time range', async ({ page }) => {
    // Wait for either picker variant to appear before deciding which path to take.
    const control = await Promise.race([
      page.waitForSelector(subj('dateRangePickerControlButton'), { timeout: 30000 }),
      page.waitForSelector(subj('superDatePickerToggleQuickMenuButton'), { timeout: 30000 }),
    ]);
    const testSubj = await control.getAttribute('data-test-subj');
    if (testSubj === 'dateRangePickerControlButton') {
      await control.click();
      await page.click(subj('dateRangePickerPresetItem-Last_30_days'));
    } else {
      await control.click();
      await page.click(subj('superDatePickerCommonlyUsed_Last_30 days'));
    }
  })

  .step('Wait for visualization animations to finish', async ({ kibanaPage }) => {
    await kibanaPage.waitForVisualizations({ count: 1 });
  });
