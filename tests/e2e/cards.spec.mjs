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

test('playing cards use the OpenCrew visual card system',async({page})=>{
  await page.goto('/');
  await page.locator('.campaign-card.orbital').click();
  await page.getByRole('button',{name:'Start with bots'}).click();
  await expect(page.locator('.hand .card').first()).toBeVisible();
  await expect(page.locator('.hand .card .card-corner-top').first()).toBeVisible();
  await expect(page.locator('.hand .card .hero-emblem svg').first()).toBeVisible();
  await expect(page.locator('.hand .card .card-label').first()).toBeVisible();
  await expect(page.locator('.task.objective-card').first()).toBeVisible();
});

test('signal choices render as instrument markers',async({page})=>{
  await page.goto('/');
  await page.locator('.campaign-card.abyss').click();
  await page.getByRole('button',{name:'Start with bots'}).click();
  await finishBriefing(page);
  const chip=page.locator('.signal-chip').first();
  if(await chip.count()){
    await expect(chip.locator('.signal-kind')).toBeVisible();
    await expect(chip.locator('.signal-emblem svg')).toBeVisible();
  }
});
