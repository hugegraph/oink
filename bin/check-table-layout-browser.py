#!/usr/bin/env python3
"""Verify native table geometry in the built bilingual Hugo fixture (no JS deps)."""
import argparse
import json
from functools import partial
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import tempfile
from threading import Thread


PROBE = r'''<script>
window.addEventListener('load', () => {
  const problems = [];
  const table = document.getElementById('configuration-keys-table');
  const pd = document.getElementById('wide-technical-table');
  const ordinary = document.getElementById('ordinary-prose-table');
  const wrapper = table?.closest('.td-table-scroll');
  const row = table && [...table.tBodies[0].rows].find(row =>
    row.cells[0].textContent.trim() === 'rocksdb.data_path');
  const disks = table && [...table.tBodies[0].rows].find(row =>
    row.cells[0].textContent.trim() === 'rocksdb.data_disks');
  function lines(cell) {
    if (!cell) return Infinity;
    const range = document.createRange();
    range.selectNodeContents(cell);
    return [...range.getClientRects()].filter(rect => rect.width > 0).length;
  }
  function require(ok, message) { if (!ok) problems.push(message); }
  const desktop = window.innerWidth >= 1000;
  require(table?.classList.contains('td-table--wide'), 'technical marker missing');
  require(row && disks, 'configuration identifiers missing');
  require(row?.cells[0].getBoundingClientRect().width >= 125, 'configuration column compressed');
  require(lines(row?.cells[0]) === 1 && lines(disks?.cells[0]) === 1,
    'configuration identifiers wrapped');
  require(pd?.classList.contains('td-table--wide'), 'PD marker missing');
  if (desktop) {
    require(pd?.tBodies[0].rows[0].cells[4].getBoundingClientRect().width >= 200,
      'PD description squeezed');
    const prose = ordinary?.closest('.td-table-scroll');
    require(prose && prose.scrollWidth <= prose.clientWidth + 2,
      'ordinary prose unnecessarily scrolls');
  } else {
    require(wrapper && wrapper.scrollWidth > wrapper.clientWidth + 20,
      'mobile technical table cannot scroll');
  }
  require(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
    'document-wide overflow');
  const result = document.createElement('output');
  result.id = 'oink-table-probe';
  result.textContent = JSON.stringify({ problems, width: window.innerWidth,
    column: row?.cells[0].getBoundingClientRect().width,
    description: pd?.tBodies[0].rows[0].cells[4].getBoundingClientRect().width });
  document.body.append(result);
}, { once: true });
</script>'''


class Results(HTMLParser):
    def __init__(self):
        super().__init__()
        self.record = False
        self.value = ''

    def handle_starttag(self, tag, attrs):
        if tag == 'output' and ('id', 'oink-table-probe') in attrs:
            self.record = True

    def handle_data(self, data):
        if self.record:
            self.value += data

    def handle_endtag(self, tag):
        if tag == 'output':
            self.record = False


class FixtureHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0].rstrip('/') in (
            '/fixtures/table-layout-policy', '/zh/fixtures/table-layout-policy'
        ):
            page = Path(self.translate_path(self.path)) / 'index.html'
            if not page.is_file():
                self.send_error(404)
                return
            html = page.read_text(encoding='utf-8')
            if '</body>' not in html:
                self.send_error(500, 'missing closing body')
                return
            encoded = html.replace('</body>', PROBE + '</body>', 1).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
        else:
            super().do_GET()

    def log_message(self, *_):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--public', required=True, type=Path)
    parser.add_argument('--chrome', required=True)
    args = parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1', 0), partial(
        FixtureHandler, directory=str(args.public.resolve()))) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            for language in ('', '/zh'):
                for width in (1440, 390):
                    with tempfile.TemporaryDirectory(prefix='oink-table-chrome-') as profile:
                        url = (f'http://127.0.0.1:{server.server_port}{language}'
                               '/fixtures/table-layout-policy/')
                        cmd = [args.chrome, '--headless', '--dump-dom',
                               '--disable-background-networking', '--disable-extensions',
                               '--no-first-run', '--no-default-browser-check',
                               '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
                               '--virtual-time-budget=3000', f'--user-data-dir={profile}',
                               f'--window-size={width},1000', url]
                        run = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                        result = Results()
                        result.feed(run.stdout)
                        if run.returncode != 0 or not result.value:
                            raise RuntimeError(f'Chrome did not evaluate {url} ({width}px): '
                                               f'{run.returncode}; {run.stderr[-400:]}')
                        report = json.loads(result.value)
                        if report['problems']:
                            raise AssertionError(f'{language or "en"}/{width}px: {report}')
                        print(f'{language or "en"}/{width}px: passed, '
                              f'key {report["column"]:.1f}px, '
                              f'description {report["description"]:.1f}px')
        finally:
            server.shutdown()
            thread.join(timeout=5)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
