/* Expo enhances ordinary resource links; without JS the album remains readable. */
(() => {
  'use strict';
  const expo = document.querySelector('[data-td-expo]');
  const G = window.OinkExpoGeometry;
  if (!expo || !G) return;
  const grid = expo.querySelector('[data-td-expo-grid]');
  const items = [...grid.querySelectorAll('[data-td-expo-item]')];
  const links = items.map(item => item.querySelector('[data-td-expo-image]'));
  const controls = expo.querySelector('[data-td-expo-controls]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !motion.matches;
  let mode = expo.dataset.tdExpoMode;
  let size = Number(expo.dataset.tdExpoSize);
  const modeInputs = [...controls.querySelectorAll('input[data-td-expo-mode]')];
  const sizeInput = controls.querySelector('input[data-td-expo-size]');
  const remember = (key, value) => { try { localStorage.setItem(`td-expo-${key}`, String(value)); } catch { /* Storage is optional. */ } };
  try {
    const savedMode = localStorage.getItem('td-expo-mode');
    const savedSize = Number(localStorage.getItem('td-expo-size'));
    if (['wall', 'cards', 'seamless'].includes(savedMode)) mode = savedMode;
    if (Number.isInteger(savedSize) && savedSize >= 160 && savedSize <= 360) size = savedSize;
  } catch { /* Use author defaults when storage is unavailable. */ }
  sizeInput.value = String(size);
  let frame;
  const ratio = item => {
    const image = item.querySelector('img');
    return (Number(item.dataset.tdExpoWidth) || image.naturalWidth || 1) / (Number(item.dataset.tdExpoHeight) || image.naturalHeight || 1);
  };
  const place = (item, x, y, width, height) => {
    Object.assign(item.style, { insetInlineStart: `${x}px`, top: `${y}px`, width: `${width}px` });
    item.querySelector('.td-expo-image').style.height = `${height}px`;
  };
  const layout = () => {
    const width = grid.clientWidth;
    if (!width || !items.length) return;
    expo.dataset.tdExpoMode = mode;
    grid.classList.add('td-expo-grid--ready');
    if (mode === 'cards') {
      const gap = width < 500 ? 12 : 20;
      const columns = width < 500 ? (size >= 320 ? 1 : 2) : Math.max(2, Math.round((width + gap) / (size + gap)));
      const w = (width - gap * (columns - 1)) / columns;
      const bottoms = Array(columns).fill(0);
      items.forEach(item => {
        const column = bottoms.indexOf(Math.min(...bottoms));
        const h = Math.min(w / ratio(item), w * 2.2);
        place(item, column * (w + gap), bottoms[column], w, h);
        bottoms[column] += h + item.querySelector('figcaption').offsetHeight + gap;
      });
      grid.style.height = `${Math.max(...bottoms) - gap}px`;
    } else {
      const gap = mode === 'seamless' ? 0 : 6;
      const target = width < 500 ? size * .65 : size;
      const boxes = G.wall(items.map(ratio), width, target, gap);
      boxes.forEach((box, i) => place(items[i], box.x, box.y, box.width, box.height));
      grid.style.height = `${Math.max(...boxes.map(box => box.y + box.height))}px`;
    }
    modeInputs.forEach(input => { input.checked = input.value === mode; });
  };
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(layout); };
  controls.hidden = false;
  modeInputs.forEach(input => input.addEventListener('change', () => { mode = input.value; remember('mode', mode); schedule(); }));
  sizeInput.addEventListener('input', event => { size = Number(event.target.value); remember('size', size); schedule(); });
  let previousWidth = 0;
  new ResizeObserver(entries => { const width = entries[0].contentRect.width; if (width !== previousWidth) { previousWidth = width; schedule(); } }).observe(grid);
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['data-td-preset'] });
  document.fonts?.ready.then(schedule);
  document.fonts?.addEventListener('loadingdone', schedule);
  items.forEach(item => item.querySelector('img').addEventListener('load', schedule));
  layout();
  const locateHash = () => {
    let node;
    try { node = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
    if (node?.matches('[data-td-expo-item]')) node.scrollIntoView({ block: 'center' });
  };
  requestAnimationFrame(locateHash);
  window.addEventListener('hashchange', locateHash);

  const motionButton = controls.querySelector('[data-td-expo-motion]');
  const animated = links.filter(link => link.dataset.tdExpoAnimated === 'true');
  const motionLabel = button => {
    const active = playing && animated.length > 0;
    const label = active ? expo.dataset.tdExpoPauseLabel : expo.dataset.tdExpoPlayLabel;
    button.title = label; button.setAttribute('aria-label', label);
    const icon = button.querySelector('i');
    icon.classList.toggle('fa-pause', active); icon.classList.toggle('fa-play', !active);
  };
  const updateMotion = () => {
    animated.forEach(link => {
      // Removing <source> after enhancement allows an explicit Play override.
      link.querySelector('source')?.remove();
      link.querySelector('img').src = playing ? link.href : link.dataset.tdExpoPoster;
    });
    motionLabel(motionButton);
  };
  motionButton.disabled = !animated.length;
  motionButton.addEventListener('click', () => { playing = !playing; updateMotion(); });
  updateMotion();

  const dialog = document.querySelector('[data-td-expo-viewer]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const get = name => dialog.querySelector(`[data-td-expo-${name}]`);
  const image = get('full'), stage = get('stage'), canvas = image.parentElement;
  const close = get('close'), prev = get('prev'), next = get('next');
  let active = 0, origin = null, zoom = 1, sizing = 'fit', dimensions = [1, 1];
  let drag = null;
  const endDrag = () => {
    const pointerId = drag?.id;
    drag = null;
    stage.classList.remove('is-dragging');
    if (pointerId !== undefined && stage.hasPointerCapture(pointerId)) stage.releasePointerCapture(pointerId);
  };
  const canPan = () => stage.scrollWidth > stage.clientWidth + 1 || stage.scrollHeight > stage.clientHeight + 1;
  const bounds = () => ({ min: Math.min(.1, G.scale(...dimensions, stage.clientWidth, stage.clientHeight)), max: Math.max(8, G.scale(...dimensions, stage.clientWidth, stage.clientHeight, 'expand')) });
  const resizeImage = (recenter = true) => {
    const [w, h] = dimensions;
    const oldWidth = parseFloat(image.style.width) || w, oldHeight = parseFloat(image.style.height) || h;
    const centerX = (stage.scrollLeft + stage.clientWidth / 2) / Math.max(oldWidth, stage.clientWidth);
    const centerY = (stage.scrollTop + stage.clientHeight / 2) / Math.max(oldHeight, stage.clientHeight);
    stage.style.overflow = sizing === 'manual' ? 'auto' : 'hidden';
    if (sizing !== 'manual') zoom = G.scale(w, h, stage.clientWidth, stage.clientHeight, sizing);
    Object.assign(image.style, { width: `${w * zoom}px`, height: `${h * zoom}px` });
    canvas.style.width = `${Math.max(stage.clientWidth, w * zoom)}px`;
    canvas.style.height = `${Math.max(stage.clientHeight, h * zoom)}px`;
    get('scale').textContent = `${Math.round(zoom * 100)}%`;
    const limits = bounds();
    get('minus').disabled = zoom <= limits.min + .00001;
    get('plus').disabled = zoom >= limits.max - .00001;
    if (recenter) {
      stage.scrollLeft = Math.max(0, centerX * Math.max(stage.clientWidth, w * zoom) - stage.clientWidth / 2);
      stage.scrollTop = Math.max(0, centerY * Math.max(stage.clientHeight, h * zoom) - stage.clientHeight / 2);
    }
    stage.classList.toggle('is-pannable', canPan());
  };
  const setSource = () => {
    const link = links[active];
    image.src = link.dataset.tdExpoAnimated === 'true' && !playing ? link.dataset.tdExpoPoster : link.href;
    motionLabel(get('viewer-motion'));
  };
  const show = index => {
    // A boundary key must not reset the currently viewed image.
    if (index < 0 || index >= links.length) return;
    endDrag();
    active = G.clamp(index, 0, links.length - 1);
    const link = links[active], data = link.dataset;
    dimensions = [Number(items[active].dataset.tdExpoWidth) || 1, Number(items[active].dataset.tdExpoHeight) || 1];
    sizing = 'fit';
    image.alt = link.querySelector('img').alt;
    image.hidden = false;
    document.getElementById('td-expo-viewer-title').textContent = data.tdExpoTitle;
    get('caption').textContent = data.tdExpoCaption;
    get('caption').hidden = !data.tdExpoCaption;
    get('byline').textContent = data.tdExpoByline;
    get('position').textContent = `${active + 1} / ${links.length}`;
    get('original').href = link.href;
    get('locate').href = data.tdExpoPermalink;
    get('viewer-motion').hidden = data.tdExpoAnimated !== 'true';
    prev.disabled = active === 0; next.disabled = active === links.length - 1;
    setSource(); resizeImage(false); stage.scrollTo(0, 0);
  };
  image.addEventListener('load', () => {
    if (!dialog.open) return;
    // Original metadata wins when a paused GIF is represented by a small poster.
    if (!Number(items[active].dataset.tdExpoWidth)) dimensions = [image.naturalWidth, image.naturalHeight];
    resizeImage(false);
  });
  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault(); origin = link;
    // WebKit does not focus pointer-activated links before native modal restore.
    origin.focus({ preventScroll: true });
    const width = document.documentElement.getBoundingClientRect().width;
    dialog.showModal();
    // Some overlay/custom scrollbar combinations ignore scrollbar-gutter.
    // Compensate only for space the browser actually removed during locking.
    document.body.style.setProperty('--td-expo-scrollbar-width', `${Math.max(0, document.documentElement.getBoundingClientRect().width - width)}px`);
    show(index); close.focus({ preventScroll: true });
  }));
  prev.addEventListener('click', () => show(active - 1));
  next.addEventListener('click', () => show(active + 1));
  close.addEventListener('click', () => dialog.close());
  const reset = mode => { endDrag(); sizing = mode; resizeImage(false); stage.scrollTo(0, 0); };
  get('fit').addEventListener('click', () => reset('fit'));
  get('expand').addEventListener('click', () => reset('expand'));
  const adjust = factor => { endDrag(); sizing = 'manual'; const { min, max } = bounds(); zoom = G.clamp(zoom * factor, min, max); resizeImage(); };
  get('plus').addEventListener('click', () => adjust(1.25));
  get('minus').addEventListener('click', () => adjust(1 / 1.25));
  stage.addEventListener('pointerdown', event => {
    // Touch keeps native scrolling and pinch behavior; only primary mouse/pen drags pan.
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || !canPan()) return;
    // Leave classic scrollbar interactions to the browser.
    const box = stage.getBoundingClientRect();
    if (event.clientX >= box.left + stage.clientWidth || event.clientY >= box.top + stage.clientHeight) return;
    event.preventDefault();
    stage.focus({ preventScroll: true });
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop };
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    if (!(event.buttons & 1)) { endDrag(); return; }
    stage.scrollLeft = drag.left - (event.clientX - drag.x);
    stage.scrollTop = drag.top - (event.clientY - drag.y);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(type, endDrag);
  window.addEventListener('blur', endDrag);
  get('viewer-motion').addEventListener('click', () => { playing = !playing; updateMotion(); setSource(); });
  motion.addEventListener('change', () => { playing = !motion.matches; updateMotion(); if (dialog.open) setSource(); });
  get('locate').addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    // Keep the native link for modified clicks, but own in-page location and
    // focus together: Firefox fragment navigation can otherwise steal focus.
    if (location.href !== get('locate').href) history.pushState(history.state, '', get('locate').href);
    origin = links[active]; dialog.close();
    const target = items[active], trigger = origin;
    requestAnimationFrame(() => {
      if (dialog.open) return;
      target.scrollIntoView({ block: 'center' });
      trigger.focus({ preventScroll: true });
    });
  });
  dialog.addEventListener('keydown', event => {
    if (!dialog.open || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    const key = event.key.toLowerCase();
    const pan = { w: [0, 80], a: [80, 0], s: [0, -80], d: [-80, 0] }[key];
    if (pan) {
      event.preventDefault(); endDrag();
      // Move the image in the named direction, just as a pointer drag does.
      stage.scrollBy({ left: pan[0], top: pan[1], behavior: 'instant' });
    } else if (['q', 'h'].includes(key) || (key === 'arrowleft' && stage.scrollWidth <= stage.clientWidth + 1)) {
      event.preventDefault(); show(active - 1);
    } else if (['e', 'l'].includes(key) || (key === 'arrowright' && stage.scrollWidth <= stage.clientWidth + 1)) {
      event.preventDefault(); show(active + 1);
    } else if (['+', '=', 'k'].includes(key)) { event.preventDefault(); adjust(1.25);
    } else if (['-', 'j'].includes(key)) { event.preventDefault(); adjust(1 / 1.25);
    } else if (['0', 'r'].includes(key)) { event.preventDefault(); reset('fit');
    } else if (key === 'f') { event.preventDefault(); reset('expand'); }
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    endDrag();
    document.body.style.removeProperty('--td-expo-scrollbar-width');
    image.removeAttribute('src');
    if (!document.activeElement || document.activeElement === document.body || dialog.contains(document.activeElement)) origin?.focus({ preventScroll: true });
  });
  let backdrop = false;
  dialog.addEventListener('pointerdown', event => { backdrop = event.target === dialog; });
  dialog.addEventListener('click', event => { if (event.target === dialog && backdrop) dialog.close(); backdrop = false; });
  new ResizeObserver(() => { if (dialog.open) resizeImage(false); }).observe(stage);
})();
