import { test, expect } from '@playwright/test';

test('long two-slot hand stays inside mobile table',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.locator('.campaign-card.orbital').click();
  await page.locator('select').selectOption('2');
  await page.getByRole('button',{name:'Start with bots'}).click();
  const cards=page.locator('.hand .card');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(13);
  const first=await cards.first().boundingBox();
  const last=await cards.last().boundingBox();
  expect(first).not.toBeNull();expect(last).not.toBeNull();
  expect(first.x).toBeGreaterThanOrEqual(0);
  expect(last.x+last.width).toBeLessThanOrEqual(390);
});
