import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('index.html contains the complete client without external CSS or JS files', () => {
  assert.doesNotMatch(html, /<link\b[^>]*\brel=["']?stylesheet["']?[^>]*\bhref=/i);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/i);
  assert.match(html, /function campaignMission\(/);
  assert.match(html, /function randomMission\(/);
  assert.match(html, /function createGame\(/);
  assert.match(html, /class Multiplayer/);
  assert.match(html, /const BOT_NAMES=/);
  assert.match(html, /opencrew\.lastGame/);
  assert.match(html, /mini-card/);
  assert.match(html, /OPENCREW/);
});
