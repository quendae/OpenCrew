import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('index.html contains the complete client without external CSS or JS files', () => {
  assert.doesNotMatch(html, /<link\b[^>]*\brel=["']?stylesheet["']?[^>]*\bhref=/i);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/i);
  assert.match(html, /const Missions=\(\(\)=>/);
  assert.match(html, /const Game=\(\(\)=>/);
  assert.match(html, /const Bot=\(\(\)=>/);
  assert.match(html, /const MultiplayerModule=\(\(\)=>/);
  assert.match(html, /OPENCREW/);
  assert.match(html, /card-back-core/);
});
