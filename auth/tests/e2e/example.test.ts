import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:8000/staff/login/');
  await page.getByRole('textbox', { name: 'Email:' }).click();
  await page.getByRole('textbox', { name: 'Email:' }).fill('wrong password');
  await page.getByRole('textbox', { name: 'Password:' }).click();
  await page.getByRole('textbox', { name: 'Password:' }).fill('hello nigga');
  await page.getByRole('checkbox', { name: 'Remember me' }).check();
  await page.getByRole('checkbox', { name: 'Remember me' }).uncheck();
  await page.getByRole('checkbox', { name: 'Remember me' }).check();
  await page.getByRole('checkbox', { name: 'Remember me' }).dblclick();
  await page.getByRole('button', { name: 'Log In' }).click();
});