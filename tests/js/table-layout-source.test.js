'use strict';

// Deterministic source guard; native browser geometry is checked by
// bin/check-table-layout-browser.py against the built fixtures.
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
const policy = blockAfter(screen, '&:where(:not(.td-table-scroll--static)) > table');
const widthIs = value => new RegExp(`(?:^|[;{])\\s*width:\\s*${value};`, 'm');

test('ordinary screen tables prefer fitting; wide mode is explicit', () => {
  const top = policy.slice(0, policy.indexOf('&:where(.td-table--wide)'));
  assert.match(top, widthIs('auto'));
  assert.match(top, /\bmax-width:\s*none;/);
  assert.doesNotMatch(top, widthIs('max-content'));
  assert.match(blockAfter(policy, '&:where(.td-table--wide)'), widthIs('max-content'));
});

test('width declarations cannot be spoofed by min-/max-width', () => {
  const top = policy.slice(0, policy.indexOf('&:where(.td-table--wide)'));
  const brokenTop = top.replace(/(^\s*)width:\s*auto;/m, '$1min-width: auto;');
  assert.notEqual(brokenTop, top);
  assert.doesNotMatch(brokenTop, widthIs('auto'));
  const wide = blockAfter(policy, '&:where(.td-table--wide)');
  const brokenWide = wide.replace(/(^\s*)width:\s*max-content;/m, '$1max-width: max-content;');
  assert.notEqual(brokenWide, wide);
  assert.doesNotMatch(brokenWide, widthIs('max-content'));
});

test('both layout policies preserve wrapping and the scrolling viewport', () => {
  assert.match(policy, /overflow-wrap:\s*break-word;/);
  assert.match(policy, /word-break:\s*normal;/);
  assert.match(policy, /max-width:\s*40ch;/);
  assert.match(viewport, /overflow-x:\s*auto;/);
  assert.match(blockAfter(viewport, '> table {'), /min-width:\s*100%;/);
});

test('wide mode is assigned only inside the non-static screen policy', () => {
  assert.equal((source.match(/&:where\(\.td-table--wide\)\s*\{/g) || []).length, 1);
  assert.equal((policy.match(/&:where\(\.td-table--wide\)\s*\{/g) || []).length, 1);
});

test('cell sizing does not leak into nested static tables', () => {
  assert.ok(policy.includes('> :where(thead, tbody, tfoot) > :where(tr) > :is(th, td)'));
  assert.ok(policy.includes('> :where(thead, tbody, tfoot) > :where(tr) > td'));
  assert.match(blockAfter(viewport, '&--static'), /overflow-wrap:\s*anywhere;/);
});
