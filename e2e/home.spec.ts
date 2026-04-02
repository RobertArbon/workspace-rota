import { test, expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/TanStack Start Starter/)
})

test('sign in button visible when signed out', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})
