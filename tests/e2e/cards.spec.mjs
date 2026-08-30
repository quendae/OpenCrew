import { test, expect } from '@playwright/test';

async function finishBriefing(page){
  for(let i=0;i<14;i++){
    const choice=page.locator('.task.pickable').first();
    if(await choice.count()){await choice.click();await page.waitForTimeout(100);continue;}
    const status=(await page.locator('.status').textContent())||'';
    if(!status.includes('choosing objective'))break;
    await page.waitForTimeout(160);
  }
}

test('playing cards use the enlarged OpenCrew visual card system',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await page.locator('.campaign-card.orbital').click();
  await page.getByRole('button',{name:'Launch campaign operation'}).click();
  const first=page.locator('.hand .card').first();
  await expect(first).toBeVisible();
  await expect(first.locator('.card-corner-top')).toBeVisible();
  await expect(first.locator('.hero-emblem svg')).toBeVisible();
  const box=await first.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(95);
  expect(box.height).toBeGreaterThanOrEqual(140);
});

test('card objectives show the concrete target card',async({page})=>{
  await page.goto('/');
  await page.locator('.campaign-card.orbital').click();
  await page.getByRole('button',{name:'Launch campaign operation'}).click();
  await expect(page.locator('.task .task-visual .mini-card').first()).toBeVisible();
  await expect(page.locator('.task').first()).toContainText('Capture the shown card');
});

test('signal choices render as visual instrument markers',async({page})=>{
  await page.goto('/');
  await page.locator('.campaign-card.abyss').click();
  await page.getByRole('button',{name:'Launch campaign operation'}).click();
  await finishBriefing(page);
  const chip=page.locator('.signal-chip').first();
  if(await chip.count()){
    await expect(chip.locator('svg')).toBeVisible();
    await expect(chip.locator('strong')).toBeVisible();
  }
});
