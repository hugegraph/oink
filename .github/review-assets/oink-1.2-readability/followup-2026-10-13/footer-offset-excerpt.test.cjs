// Source: assets/js/docs-shell.js, initFooterOffset() only.
// Baseline f8f476e660cf053a2645b7b923ae8d08d5448fce, lines 138-171;
// candidate 4e40bd880ea6e2988b9ed2046655abd7588ea8a9, lines 138-173.
// Excerpt read from GitHub on 2026-10-13; the selector change is the entire
// executable difference within this function. This is archived evidence,
// not a replacement for the full-script test or browser integration tests.
// Run: node --test footer-offset-excerpt.test.cjs
// Negative control: FOOTER_VARIANT=baseline node --test footer-offset-excerpt.test.cjs
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const test = require('node:test');

const baseline = String.raw`  function initFooterOffset() {
    var footer = document.querySelector('[data-td-shell-footer]');
    var panel = document.querySelector('.td-shell-sidebar__panel');
    if (!footer || !panel) return;
    var frame = 0;

    function update() {
      frame = 0;
      var viewportHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;
      var offset = Math.max(
        0,
        viewportHeight - footer.getBoundingClientRect().top,
      );
      if (offset > 0) offset += 1;
      html.style.setProperty('--td-shell-footer-offset', offset + 'px');
    }
    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('scroll', schedule, {
        passive: true,
      });
      window.visualViewport.addEventListener('resize', schedule);
    }
    if ('ResizeObserver' in window)
      new ResizeObserver(schedule).observe(footer);
    update();
  }
`;
const candidate = baseline.replace(
  "    var panel = document.querySelector('.td-shell-sidebar__panel');",
  "    var panel = document.querySelector(\n      '.td-shell-sidebar__panel, .td-shell-toc__panel',\n    );",
);
const variant = process.env.FOOTER_VARIANT || 'candidate';
assert.ok(['baseline', 'candidate'].includes(variant), 'FOOTER_VARIANT must be baseline or candidate');
const source = variant === 'baseline' ? baseline : candidate;

function build({ sidebar = true, toc = true, footer = true, visual = false } = {}) {
  const properties = new Map();
  const listeners = new Map();
  const visualListeners = new Map();
  const frames = [];
  const state = { top: 1100, reads: 0 };
  const element = { getBoundingClientRect() { state.reads++; return { top: state.top }; } };
  let resize;
  const document = { querySelector(selector) {
    if (selector === '[data-td-shell-footer]') return footer ? element : null;
    if (selector === '.td-shell-sidebar__panel') return sidebar ? {} : null;
    if (selector === '.td-shell-sidebar__panel, .td-shell-toc__panel') return sidebar || toc ? {} : null;
    throw new Error('Unexpected selector: ' + selector);
  } };
  const html = { style: { setProperty(key, value) { properties.set(key, value); } } };
  const window = {
    innerHeight: 1000,
    addEventListener(key, fn) { listeners.set(key, fn); },
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; },
    ResizeObserver: class {},
  };
  if (visual) window.visualViewport = {
    height: 800,
    addEventListener(key, fn) { visualListeners.set(key, fn); },
  };
  const ResizeObserver = class {
    constructor(fn) { resize = fn; }
    observe(target) { assert.equal(target, element); }
  };
  vm.runInNewContext(source + '\ninitFooterOffset();', { html, window, document, ResizeObserver });
  return {
    state, window, listeners, visualListeners,
    flush() { const pending = frames.splice(0); pending.forEach(fn => fn()); },
    resize() { resize(); },
    offset() { return properties.get('--td-shell-footer-offset'); },
  };
}

for (const rails of [
  { sidebar: true, toc: true },
  { sidebar: true, toc: false },
  { sidebar: false, toc: true },
]) test('available rails: ' + JSON.stringify(rails), () => {
  const env = build(rails);
  assert.equal(env.offset(), '0px');
  env.state.top = 670;
  env.listeners.get('scroll')();
  env.flush();
  assert.equal(env.offset(), '331px');
  env.state.top = 1200;
  env.listeners.get('scroll')();
  env.flush();
  assert.equal(env.offset(), '0px');
});

test('coalesces scroll events and tracks footer/window resizing', () => {
  const env = build();
  const reads = env.state.reads;
  env.state.top = 700;
  for (let i = 0; i < 10; i++) env.listeners.get('scroll')();
  assert.equal(env.state.reads, reads);
  env.flush();
  assert.equal(env.state.reads, reads + 1);
  assert.equal(env.offset(), '301px');
  env.state.top = 950;
  env.resize();
  env.flush();
  assert.equal(env.offset(), '51px');
  env.window.innerHeight = 900;
  env.listeners.get('resize')();
  env.flush();
  assert.equal(env.offset(), '0px');
});

test('TOC-only rail tracks visual viewport changes', () => {
  const env = build({ sidebar: false, visual: true });
  assert.equal(env.offset(), '0px');
  env.state.top = 700;
  env.visualListeners.get('scroll')();
  env.flush();
  assert.equal(env.offset(), '101px');
  env.window.visualViewport.height = 750;
  env.visualListeners.get('resize')();
  env.flush();
  assert.equal(env.offset(), '51px');
});

for (const missing of [{ footer: false }, { sidebar: false, toc: false }])
test('no measurements without footer/consumer: ' + JSON.stringify(missing), () => {
  const env = build(missing);
  assert.equal(env.offset(), undefined);
  assert.equal(env.state.reads, 0);
  assert.equal(env.listeners.has('scroll'), false);
});
