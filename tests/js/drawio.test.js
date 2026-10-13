'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../../assets/js/drawio.js'), 'utf8');

function editor(server = 'https://editor.example/edit?lang=zh#diagram') {
  const elements = [];
  const messages = [];
  const downloads = [];
  const listeners = new Map();
  function element(tagName) {
    const attributes = new Map();
    const events = new Map();
    const node = {
      tagName, children: [], classList: { add() {} },
      setAttribute(key, value) { attributes.set(key, value); },
      getAttribute(key) { return attributes.get(key); },
      addEventListener(key, fn) { events.set(key, fn); },
      click() {
        if (tagName === 'a') downloads.push(attributes.get('href'));
        events.get('click')?.();
      },
      appendChild(child) { this.children.push(child); child.parentNode = this; },
      insertBefore(child) { this.appendChild(child); },
      removeChild(child) { this.children = this.children.filter(item => item !== child); },
      insertAdjacentHTML() {},
      closest() { return null; },
    };
    if (tagName === 'iframe') node.contentWindow = {
      postMessage(data, origin) { messages.push({ data: JSON.parse(data), origin }); },
    };
    elements.push(node);
    return node;
  }
  const image = element('img');
  image.src = 'https://site.example/diagram.svg';
  const body = element('body');
  body.appendChild(image);
  const document = {
    baseURI: 'https://site.example/docs/', body,
    createElement: element,
    getElementById() { return { textContent: JSON.stringify({ server }) }; },
    querySelectorAll() { return [image]; },
    addEventListener(event, fn) { listeners.set(event, fn); },
  };
  const window = {
    addEventListener(event, fn) { listeners.set(event, fn); },
    removeEventListener(event, fn) { if (listeners.get(event) === fn) listeners.delete(event); },
  };
  vm.runInNewContext(source, {
    document, window, URL,
    XMLHttpRequest: class {
      status = 200;
      response = {};
      open() {}
      addEventListener(event, fn) { this.onload = fn; }
      send() { this.onload(); }
    },
    FileReader: class {
      addEventListener(event, fn) { this.onload = fn; }
      readAsBinaryString() { this.result = '<svg><!-- mxfile --></svg>'; this.onload(); }
      readAsDataURL() { this.result = 'data:image/svg+xml;base64,PHN2Zz4='; this.onload(); }
    },
  });
  listeners.get('DOMContentLoaded')();
  elements.find(node => node.tagName === 'button').click();
  const frame = elements.find(node => node.tagName === 'iframe');
  return {
    frame, messages, downloads,
    send(data, origin = 'https://editor.example', sender = frame.contentWindow) {
      listeners.get('message')?.({ data, origin, source: sender });
    },
    listening() { return listeners.has('message'); },
  };
}

test('Draw.io preserves editor query parameters and fragments', () => {
  for (const server of ['https://editor.example/edit?lang=zh#diagram', '/edit?lang=zh#diagram']) {
    const runtime = editor(server);
    const url = new URL(runtime.frame.getAttribute('src'), 'https://site.example/docs/');
    assert.equal(url.searchParams.get('lang'), 'zh');
    assert.equal(url.searchParams.get('embed'), '1');
    assert.equal(url.searchParams.get('proto'), 'json');
    assert.equal(url.hash, '#diagram');
  }
});

test('Draw.io ignores unrelated, malformed and wrong-origin messages', () => {
  const runtime = editor();
  for (const data of [null, {}, '', 'not json', 'null', '[]']) {
    assert.doesNotThrow(() => runtime.send(data));
    assert.doesNotThrow(() => runtime.send(data, 'https://unrelated.example', {}));
  }
  runtime.send('{"event":"init"}', 'https://unrelated.example');
  runtime.send('{"event":"init"}', 'https://editor.example', {});
  assert.deepEqual(runtime.messages, []);
  runtime.send('{"event":"init"}');
  assert.equal(runtime.messages[0].data.action, 'load');
  assert.equal(runtime.messages[0].origin, 'https://editor.example');
  runtime.send('{"event":"save"}');
  assert.deepEqual(runtime.messages[1], {
    data: { action: 'export', format: 'xmlsvg' }, origin: 'https://editor.example',
  });
});

test('Draw.io downloads image exports only and cleans up its message listener', () => {
  const runtime = editor();
  for (const data of [null, 'javascript:alert(1)', 'https://unrelated.example/file', 'data:text/html,<script>']) {
    runtime.send(JSON.stringify({ event: 'export', data }));
    assert.equal(runtime.listening(), true);
    assert.deepEqual(runtime.downloads, []);
  }
  const data = 'data:image/svg+xml;base64,PHN2Zz4=';
  runtime.send(JSON.stringify({ event: 'export', data }));
  assert.deepEqual(runtime.downloads, [data]);
  assert.equal(runtime.listening(), false);
});
