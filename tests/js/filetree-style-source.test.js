'use strict';

// Source contracts complement output text checks; only the sibling docsite's
// browser tests establish actual text-fragment containment and interactions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(
  path.join(__dirname, '../../assets/scss/td/_filetree.scss'), 'utf8',
).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const found = source.match(new RegExp('^' + escaped + '\\s*\\{([\\s\\S]*?)^\\}', 'm'));
  assert.ok(found, 'missing owning block: ' + selector);
  return found[1];
}

test('FileTree rows grow but preserve their minimum height', () => {
  const row = block('.td-filetree__row');
  assert.match(row, /\bblock-size:\s*auto;/);
  assert.match(row, /\bmin-block-size:\s*var\(--td-filetree-row\);/);
  assert.doesNotMatch(row, /(?:^|[;\n])\s*block-size:\s*var\(/);
});

test('FileTree comments wrap without clipping while names retain ellipsis', () => {
  assert.match(block('.td-filetree__comment'), /white-space:\s*normal;/);
  const text = block('.td-filetree__comment-text');
  assert.match(text, /overflow-wrap:\s*anywhere;/);
  assert.doesNotMatch(text, /overflow:\s*hidden|text-overflow:\s*ellipsis|white-space:\s*nowrap/);
  const name = block('.td-filetree__name');
  assert.match(name, /white-space:\s*nowrap;/);
  assert.match(name, /text-overflow:\s*ellipsis;/);
});
