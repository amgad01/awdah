import { test, expect } from '@playwright/test';

test.describe('Contributing page', () => {
  test('shows the desktop scroll layout on desktop viewports', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'desktop layout assertion only');

    await page.goto('/contribute');

    await expect(page.getByTestId('contributing-desktop-view')).toBeVisible();
    await expect(page.getByTestId('contributing-mobile-view')).toBeHidden();
  });

  test('shows the mobile swipe layout and supports swipe navigation on mobile', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile layout assertion only');

    await page.goto('/contribute');

    const mobileView = page.getByTestId('contributing-mobile-view');

    await expect(mobileView).toBeVisible();
    await expect(page.getByTestId('contributing-desktop-view')).toBeHidden();

    const swipeArea = page.getByTestId('mobile-swipeable-sections-swipe-area');
    await expect(mobileView).toContainText('Scholar Review & Fiqh Validation');

    const box = await swipeArea.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      throw new Error(
        'Expected mobile swipe area to have a bounding box before performing swipe navigation.',
      );
    }

    await page.mouse.move(box.x + box.width - 12, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 12, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect(mobileView).toContainText('Frontend Improvements');
  });
});
