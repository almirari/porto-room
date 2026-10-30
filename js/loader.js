// Halftone loading screen, driven by textures/cat.mp4.
// show() starts it, hide() dissolves it. It waits until it has been visible for MIN_SHOW ms.
const BG       = '#f3e6d0';   // paper
const DOT      = '#3b2a20';   // ink
const CELL     = 14;          // dot pitch in CSS px (desktop)
const CELL_SM  = 10;          // dot pitch on narrow screens
const FPS      = 30;
const CONTRAST = 1.25;        // >1 = punchier cat
const BRIGHT   = 0.0;         // -1..1
const INVERT   = false;       // true if the cat is LIGHT on a dark background (dots would be missing/reversed)
const MIN_SHOW = 600;         // ms, avoids a flash if the room is almost ready
const FADE_IN  = 250;         // ms, matches the CSS transition
const OUT_MS   = 800;         // ms, dots shrinking away

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function initLoader({ src = 'textures/cat.mp4' } = {}) {
  // overlay DOM
  const root = document.createElement('div');
  root.id = 'halftone';
  root.style.setProperty('--ht-bg', BG);
  root.style.setProperty('--ht-ink', DOT);
  root.innerHTML = '<canvas></canvas><p class="ht-text">setting up the room…</p><i class="ht-bar indet"></i>';
  document.body.appendChild(root);
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const bar = root.querySelector('.ht-bar');

  // video starts buffering right away, so it's ready if someone skips fast.
  // It is attached to the page (tiny and almost invisible) so the browser really decodes it.
  const video = document.createElement('video');
  video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'auto';
  video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', 'true');
  video.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:.01;pointer-events:none;';
  document.body.appendChild(video);
  video.addEventListener('error', () =>
    console.error('[loader] cat video failed, code', video.error && video.error.code, video.currentSrc));
  video.addEventListener('loadeddata', () =>
    console.log('[loader] cat ready', video.videoWidth + 'x' + video.videoHeight));
  video.src = src;
  video.load();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) video.play().catch(() => {});

  // tiny canvas: one pixel per dot, the browser does the averaging for us
  const small = document.createElement('canvas');
  const sctx = small.getContext('2d', { willReadFrequently: true });

  let W = 0, H = 0, dpr = 1, cell = CELL, cols = 0, rows = 0;
  let raf = 0, last = 0, shownAt = 0, outStart = 0, outT = -1;
  let active = false, doneCb = null;

  function layout() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cell = W < 600 ? CELL_SM : CELL;
    cols = Math.ceil(W / cell);
    rows = Math.ceil(H / cell);
    small.width = cols;
    small.height = rows;
  }

  // cover-fit the current video frame into the cols x rows grid
  function sample() {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || video.readyState < 2) return null;
    try {
      const s = Math.max(cols / vw, rows / vh);
      const sw = cols / s, sh = rows / s;
      sctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, cols, rows);
      return sctx.getImageData(0, 0, cols, rows).data;
    } catch (e) {
      console.warn('[loader] sample failed', e);
      return null;
    }
  }

  function draw() {
    const px = sample();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!px) return;                       // video not ready yet: just the paper + text

    const maxR = cell * 0.55;
    const cx0 = W / 2, cy0 = H / 2, maxD = Math.hypot(cx0, cy0);
    ctx.fillStyle = DOT;
    ctx.beginPath();                       // one path, one fill = cheap
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4;
        let lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
        if (INVERT) lum = 1 - lum;
        lum = clamp((lum - 0.5) * CONTRAST + 0.5 + BRIGHT);
        let rad = maxR * Math.sqrt(1 - lum);          // sqrt: dot AREA follows darkness
        const x = c * cell + cell / 2, y = r * cell + cell / 2;
        if (outT >= 0) {                              // exit: shrink outward from the center
          const d = Math.hypot(x - cx0, y - cy0) / maxD;
          const t = clamp(outT * 1.6 - d * 0.6);
          rad *= 1 - t * t * (3 - 2 * t);
        }
        if (rad > 0.4) { ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, Math.PI * 2); }
      }
    }
    ctx.fill();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 1000 / FPS) return;
    last = now;
    if (outStart) outT = clamp((now - outStart) / OUT_MS);
    draw();
    if (outT >= 1) finish();
  }

  function finish() {
    cancelAnimationFrame(raf);
    removeEventListener('resize', layout);
    video.pause();
    video.remove();
    root.remove();
    active = false;
    if (doneCb) doneCb();
  }

  return {
    get active() { return active; },

    // onCovered fires once the overlay fully hides what is underneath
    show(onCovered) {
      if (active) return;
      active = true;
      shownAt = performance.now();
      layout();
      addEventListener('resize', layout);
      root.classList.add('on');
      if (video.paused && !matchMedia('(prefers-reduced-motion: reduce)').matches) video.play().catch(() => {});
      raf = requestAnimationFrame(frame);
      if (onCovered) setTimeout(onCovered, FADE_IN);
    },

    // onExit(wasShown) fires when the dots START leaving (use it to start the fly-in)
    hide(onExit, onDone) {
      if (!active) {
        if (onExit) onExit(false);
        if (onDone) onDone();
        video.pause(); video.remove(); root.remove();   // never shown: clean up the hidden video
        return;
      }
      const wait = Math.max(0, MIN_SHOW - (performance.now() - shownAt));
      setTimeout(() => {
        doneCb = onDone || null;
        root.classList.add('out');
        root.style.pointerEvents = 'none';
        outStart = performance.now();
        if (onExit) onExit(true);
      }, wait);
    },

    // optional: real progress 0..1 (the bar is an indeterminate sweep until this is called)
    setProgress(p) {
      bar.classList.remove('indet');
      bar.style.transform = `scaleX(${clamp(p)})`;
    },
  };
}