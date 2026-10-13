'use strict';

// Deterministic source guard, not browser layout acceptance. The actual
// prose/technical geometry is checked in the sibling documentation site.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'assets/scss/td/_content.scss'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

function blockAfter(text, marker) {
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, 'missing owning selector: ' + marker);
  const open = text.indexOf('{', start);
  let depth = 1;
  for (let end = open + 1; end < text.length; end++) {
    if (text[end] === '{') depth++;
    if (text[end] === '}' && --depth === 0) return text.slice(open + 1, end);
  }
  assert.fail('unclosed source block: ' + marker);
}

const viewport = blockAfter(source, '.td-table-scroll {');
const screen = blockAfter(viewport, '@media screen');
const policy = blockAfter(screen, '&:not(.td-table-scroll--static) > table');

test('ordinary screen tables prefer fitting; wide mode is explicit', () => {
  const top = policy.slice(0, policy.indexOf('&.td-table--wide'));
  assert.match(top, /\bwidth:\s*auto;/);
  assert.match(top, /\bmax-width:\s*none;/);
  assert.doesNotMatch(top, /\bwidth:\s*max-content;/);
  assert.match(blockAfter(policy, '&.td-table--wide'), /\bwidth:\s*max-content;/);
});

test('both layout policies preserve wrapping and the scrolling viewport', () => {
  assert.match(policy, /overflow-wrap:\s*break-word;/);
  assert.match(policy, /word-break:\s*normal;/);
  assert.match(policy, /max-width:\s*40ch;/);
  assert.match(viewport, /overflow-x:\s*auto;/);
  assert.match(blockAfter(viewport, '> table {'), /min-width:\s*100%;/);
});

test('wide mode is assigned only inside the non-static screen policy', () => {
  assert.equal((source.match(/&\.td-table--wide\s*\{/g) || []).length, 1);
  assert.equal((policy.match(/&\.td-table--wide\s*\{/g) || []).length, 1);
});

test('cell sizing does not leak into nested static tables', () => {
  assert.ok(policy.includes('> :is(thead, tbody, tfoot) > tr > :is(th, td)'));
  assert.ok(policy.includes('> :is(thead, tbody, tfoot) > tr > td'));
  assert.match(blockAfter(viewport, '&--static'), /overflow-wrap:\s*anywhere;/);
});
