// The two local modules load only on an opted-in page with PlantUML fences.
// Keep SVG inside an image: authored SVG links and markup never enter the DOM.
const engineURL = {{ .engine | jsonify | safeJS }};
const vizURL = {{ .viz | jsonify | safeJS }};
const errorLabel = {{ .error | jsonify | safeJS }};
const entries = Array.from(document.querySelectorAll('pre > code.language-plantuml'), code => {
  const pre = code.parentElement;
  const figure = document.createElement('figure');
  figure.className = 'td-plantuml';
  pre.before(figure);
  figure.append(pre);
  return { pre, figure, source: code.textContent, revision: 0, url: null, image: null, error: null };
});

let enginePromise;
let dependencyError;
function engine() {
  if (!enginePromise) {
    enginePromise = Promise.all([import(vizURL), import(engineURL)]).then(([, api]) => {
      // The engine normally injects script tags for themes, sprites and stdlib.
      // This distribution contains only the engine and layout library. Refuse
      // missing resources instead of downloading code or silently losing them.
      globalThis.PLANTUML_STDLIB_LOADER = (name, ok, fail) => {
        dependencyError = new Error(`PlantUML resource is not bundled: ${name}`);
        fail(dependencyError.message);
        return true;
      };
      globalThis.PLANTUML_FILE_LOADER = (name, from, ok, fail) => {
        dependencyError = new Error(`PlantUML include is not available: ${name}`);
        fail(dependencyError.message);
      };
      return api;
    });
  }
  return enginePromise;
}

function release(entry) {
  entry.image?.remove();
  entry.image = null;
  if (entry.url) URL.revokeObjectURL(entry.url);
  entry.url = null;
}

function fail(entry, error) {
  release(entry);
  entry.pre.hidden = false;
  if (!entry.error) {
    entry.error = document.createElement('p');
    entry.error.className = 'td-diagram__error';
    entry.error.setAttribute('role', 'alert');
    entry.error.textContent = errorLabel;
    entry.pre.before(entry.error);
  }
  entry.figure.dataset.tdPlantumlState = 'error';
  console.warn('PlantUML:', error);
}

async function draw(entry, revision, dark) {
  if (entry.revision !== revision) return;
  try {
    const api = await engine();
    if (entry.revision !== revision) return;
    dependencyError = null;
    const source = /^\s*@start\w+/m.test(entry.source)
      ? entry.source : `@startuml\n${entry.source}\n@enduml`;
    const svg = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PlantUML render timed out')), 15000);
      api.renderToString(source.split(/\r\n|\r|\n/), value => {
        clearTimeout(timer);
        dependencyError ? reject(dependencyError) : resolve(value);
      }, error => { clearTimeout(timer); reject(new Error(error)); }, { dark });
    });
    if (entry.revision !== revision) return;
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    if (parsed.documentElement.localName !== 'svg' || parsed.querySelector('parsererror')) {
      throw new Error('PlantUML returned invalid SVG');
    }
    // 1.2026.9 also delivers syntax/include diagnostics through the success
    // callback as an error picture. Recognize its version header + marked
    // source line, not arbitrary authored text such as "Syntax Error?".
    if (parsed.querySelector('text[text-decoration="wavy underline"]') &&
        parsed.querySelector('text')?.textContent.startsWith('PlantUML version ')) {
      throw new Error('PlantUML returned a diagnostic image');
    }
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const image = new Image();
    image.alt = entry.source.trim();
    image.src = url;
    try { await image.decode(); }
    catch (error) { URL.revokeObjectURL(url); throw error; }
    if (entry.revision !== revision) { URL.revokeObjectURL(url); return; }
    release(entry);
    entry.url = url;
    const viewport = document.createElement('div');
    viewport.className = 'td-plantuml__image';
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', 'PlantUML');
    viewport.append(image);
    entry.pre.before(viewport);
    entry.image = viewport;
    entry.pre.hidden = true;
    entry.error?.remove();
    entry.error = null;
    entry.figure.dataset.tdPlantumlState = 'rendered';
    entry.figure.dataset.tdPlantumlTheme = dark ? 'dark' : 'light';
  } catch (error) {
    if (entry.revision === revision) fail(entry, error);
  }
}

// One engine instance, one render at a time. Yield between diagrams so page
// controls remain usable; revisions discard results from an older theme.
let queue = Promise.resolve();
function renderAll() {
  const dark = document.documentElement.dataset.bsTheme === 'dark';
  entries.forEach(entry => {
    // Source and available resources do not change with the color scheme.
    // Keep failed input readable rather than reusing an engine's cached,
    // incomplete theme/library result on the next redraw.
    if (entry.error) return;
    const revision = ++entry.revision;
    entry.figure.dataset.tdPlantumlState = 'pending';
    queue = queue.then(() => new Promise(resolve => setTimeout(resolve, 0)))
      .then(() => draw(entry, revision, dark));
  });
}
if (entries.length) {
  renderAll();
  new MutationObserver(renderAll).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-bs-theme'],
  });
}
