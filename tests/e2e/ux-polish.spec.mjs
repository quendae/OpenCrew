import { test, expect } from '@playwright/test';

test('campaign difficulty rises with unlocked operations',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('opencrew.progress.orbital','30'));
  await page.goto('/');
  await page.locator('.campaign-card.orbital').click();
  await expect(page.locator('.relay-note').first()).toContainText('Difficulty 5/6');
  await expect(page.locator('input[type=number]')).toHaveValue('31');
});

test('random operation remains available as a separate replay mode',async({page})=>{
  await page.goto('/');
  await page.locator('.campaign-card.abyss').click();
  await page.locator('.mode-tab').filter({hasText:'Random Operation'}).click();
  await expect(page.getByRole('button',{name:'Generate & launch operation'})).toBeVisible();
  await expect(page.locator('.relay-note').first()).toContainText('Free Operations');
});

test('bots have stable names, colors and symmetric desktop seats',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await page.locator('.campaign-card.orbital').click();
  await page.getByRole('button',{name:'Launch campaign operation'}).click();
  const seats=page.locator('.seat-bar .seat');
  await expect(seats).toHaveCount(3);
  const texts=await seats.allTextContents();
  expect(texts.join(' ')).toContain('Nova');
  expect(texts.join(' ')).toContain('Mira');
  expect(texts.join(' ')).toContain('Orion');
  const table=await page.locator('.table').boundingBox();
  const boxes=[];for(let i=0;i<3;i++)boxes.push(await seats.nth(i).boundingBox());
  const centers=boxes.map(b=>b.x+b.width/2).sort((a,b)=>a-b);
  const center=table.x+table.width/2;
  expect(Math.abs(centers[1]-center)).toBeLessThan(6);
  expect(Math.abs((center-centers[0])-(centers[2]-center))).toBeLessThan(10);
});

test('local game autosaves and can be continued from main menu',async({page})=>{
  await page.goto('/');
  await page.locator('.campaign-card.ember').click();
  await page.getByRole('button',{name:'Launch campaign operation'}).click();
  await expect(page.locator('.game')).toBeVisible();
  await page.getByRole('button',{name:'Menu'}).click();
  const resume=page.locator('.continue-card');
  await expect(resume).toBeVisible();
  await expect(resume).toContainText('CONTINUE LAST GAME');
  await resume.click();
  await expect(page.locator('.game')).toBeVisible();
  await expect(page.locator('.mission-rail')).toContainText('Emberline').or;
});
