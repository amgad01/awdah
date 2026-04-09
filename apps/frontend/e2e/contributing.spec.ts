import { test, expect } from '@playwright/test';

test.describe('Contributing page', () => {
  test('shows the desktop scroll layout on desktop viewports', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'desktop layout assertion only');

    await page.goto('/contribute');

    await expect(page.getByTestId('contributing-desktop-view')).toBeVisible();
    await expect(page.getByTestId('contributing-mobile-view')).toBeHidden();
  });

  test('shows the mobile swipe layout and supports slider navigation on mobile', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile layout assertion only');

    await page.goto('/contribute');

    const mobileView = page.getByTestId('contributing-mobile-view');
    const firstSlider = page.getByTestId('swiper-sections').first();

    await expect(mobileView).toBeVisible();
    await expect(page.getByTestId('contributing-desktop-view')).toBeHidden();
    await expect(mobileView).toContainText('Review and verify fiqh references');
    await firstSlider.getByRole('button', { name: 'Next' }).click();

    await expect(mobileView).toContainText('Review Arabic religious terminology');
    await firstSlider.getByRole('button', { name: 'Next' }).click();

    await expect(mobileView).toContainText('Validate the bulugh calculation logic');
    await firstSlider.getByRole('button', { name: 'Next' }).click();

    await expect(mobileView).toContainText('Frontend Improvements');
  });
});
