import { test, expect } from '@playwright/test';

const sizes=[[1440,900],[1024,768],[390,844],[844,390]];

async function noOverflow(page){
  const x=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(x).toBeLessThanOrEqual(1);
}

async function finishBriefing(page){
  for(let i=0;i<12;i++){
    const choice=page.locator('.task.pickable').first();
    if(await choice.count()){await choice.click();await page.waitForTimeout(120);continue;}
    const text=(await page.locator('.status').textContent())||'';
    if(!text.includes('choosing objective'))break;
    await page.waitForTimeout(200);
  }
}

test('shows three campaigns',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.campaign-card')).toHaveCount(3);
  await expect(page.locator('.campaign-card.orbital')).toContainText('Helios Reach');
  await expect(page.locator('.campaign-card.abyss')).toContainText('Abyssal Signal');
  await expect(page.locator('.campaign-card.ember')).toContainText('Emberline');
});

for(const [width,height] of sizes){
  test(`layout ${width}x${height}`,async({page})=>{
    await page.setViewportSize({width,height});await page.goto('/');await noOverflow(page);
    await page.locator('.campaign-card.ember').click();await noOverflow(page);
    await page.getByRole('button',{name:'Launch campaign operation'}).click();
    await expect(page.locator('.game')).toBeVisible();await finishBriefing(page);await noOverflow(page);
  });
}

test('two-slot mode adds Relay Drone public hand',async({page})=>{
  await page.goto('/');await page.locator('.campaign-card.orbital').click();
  await page.locator('select').selectOption('2');await page.getByRole('button',{name:'Launch campaign operation'}).click();
  await expect(page.locator('.relay-hand')).toBeVisible();await expect(page.locator('.relay-cards .card')).toHaveCount(13);
});
