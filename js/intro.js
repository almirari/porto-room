const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// split a beat into reveal units: loose words become one unit each, an element (like a .ln line) is one unit
function wrapWords(el) {
  const frag = document.createDocumentFragment();
  el.childNodes.forEach(n => {
    if (n.nodeType === 3) {
      n.textContent.split(/\s+/).filter(Boolean).forEach(t => {
        const s = document.createElement('span');
        s.className = 'w'; s.textContent = t;
        frag.append(s, ' ');
      });
    } else {
      const s = document.createElement('span');
      s.className = 'w'; s.append(n.cloneNode(true));
      frag.append(s, ' ');
    }
  });
  el.replaceChildren(frag);
}

export function initIntro({ onEnter }) {
  const load = $('load'), hero = $('hero'), base = $('heroBase');
  const sceneA = $('sceneA'), sceneB = $('sceneB');
  const hint = $('hint'), status = $('status'), skip = $('skip'), cta = $('cta');
  const caption = sceneB.querySelector('.caption');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(pointer: coarse)').matches;

  // [start, end] of scroll progress for each text beat
  const RANGES = [[0.50, 1.0]];
  const beats = [...sceneB.querySelectorAll('.beat')].map(el => {
    wrapWords(el);
    return { el, words: [...el.querySelectorAll('.w')] };
  });

  // ───── hover (or tap) a bold word → show its fun fact ─────
  const fact = sceneB.querySelector('.fact');
  const DEFAULT = touch ? '(tap the bold stuff)' : '(hover over the bold stuff)';
  fact.textContent = DEFAULT;
  const showFact = b => {
    fact.textContent = b ? b.dataset.fact : DEFAULT;
    fact.classList.toggle('on', !!b);
  };
  sceneB.addEventListener('pointerover', e => { if (e.pointerType === 'mouse') showFact(e.target.closest('b[data-fact]')); });
  sceneB.addEventListener('pointerout',  e => { if (e.pointerType === 'mouse') showFact(null); });
  sceneB.addEventListener('click', e => { const b = e.target.closest('b[data-fact]'); if (b) showFact(b); });

  // start decoding the images early (no half-loaded flash)
  base.decode().catch(() => {});
  hero.decode().catch(() => {});

  let ready = false, entered = false, raf = 0;
  let wantGo = false, skipped = false;   // wantGo = user clicked to continue, skipped = pressed "skip intro"
  let target = 0, cur = 0, drawn = -1;   // scroll progress 0..1 (target = input, cur = smoothed)

  // ───── input: wheel / touch / keys all just move `target` ─────
  const nudge = d => { target = clamp(target + d); };
  const onWheel = e => nudge(e.deltaY / (innerHeight * 5));
  let ty = null;
  const onTouchStart = e => { ty = e.touches[0].clientY; };
  const onTouchMove = e => {
    if (ty == null) return;
    const y = e.touches[0].clientY;
    nudge((ty - y) / (innerHeight * 1.8));
    ty = y;
  };

  const requestGo = () => { wantGo = true; target = 1; cta.style.opacity = 0; };

  const onKey = e => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') nudge(0.08);
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') nudge(-0.08);
    else if (e.key === 'End') target = 1;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'Enter') { if (cur >= 0.97) requestGo(); else target = 1; }
  };
  addEventListener('wheel', onWheel, { passive: true });
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: true });
  addEventListener('keydown', onKey);

  skip.onclick = () => { target = 1; skipped = true; };

  // click anywhere (once the text is fully shown) → enter the room
  load.addEventListener('click', e => {
    if (cur < 0.97 || e.target.closest('#skip, b[data-fact]')) return;   // bold words stay tappable for their facts
    requestGo();
  });

  // ───── one frame for progress p (only opacity/transform, so it stays on the GPU) ─────
  function render(p) {
    // A: title first, then the full board fades in on top
    const r = ease(range(p, 0.04, 0.40));   // 0 = title only, 1 = full board
    hero.style.opacity = r;
    base.style.visibility = r >= 1 ? 'hidden' : 'visible';

    // crossfade A → B, and stop painting whatever is hidden
    const b = ease(range(p, 0.40, 0.56));
    sceneB.style.opacity = b;
    sceneB.style.visibility = b > 0 ? 'visible' : 'hidden';
    sceneA.style.visibility = b >= 1 ? 'hidden' : 'visible';
    caption.style.opacity = range(p, 0.52, 0.6);

    hint.style.opacity = 1 - range(p, 0, 0.04);
    skip.style.opacity = 1 - range(p, 0.9, 0.97);
    skip.style.pointerEvents = p > 0.95 ? 'none' : 'auto';

    // B: line-by-line / word-by-word reveals
    beats.forEach((bt, i) => {
      const [s] = RANGES[i];
      const t = range(p, s, RANGES[i][1]);
      bt.el.style.opacity = t > 0 ? 1 : 0;
      bt.el.classList.toggle('live', t > 0.05);   // bold words are hoverable only while visible
      const reveal = clamp(t / 0.4);
      const n = bt.words.length;
      bt.words.forEach((w, k) => {
        const v = clamp(reveal * (n + 2) - k);
        w.style.opacity = v;
        w.style.transform = `translateY(${((1 - v) * 0.35).toFixed(2)}em)`;
      });
    });

    // "click anywhere to continue" appears once the text is fully revealed
    cta.style.opacity = (wantGo || skipped) ? 0 : range(p, 0.96, 1);
    load.style.cursor = p >= 0.97 ? 'pointer' : '';
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - tick.last) / 1000 || 0.016, 0.05);
    tick.last = now;
    cur = reduce ? target : cur + (target - cur) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - cur) < 0.0004) cur = target;
    if (cur !== drawn) { render(cur); drawn = cur; }   // idle = zero work

    if (cur >= 0.995 && (wantGo || skipped)) {
      if (ready) go();
      else status.style.opacity = 1;   // clicked before the models finished loading
    }
  }
  tick.last = 0;
  raf = requestAnimationFrame(tick);

  // ───── enter the 3D room ─────
  function go() {
    if (!ready || entered || cur < 0.995) return;
    entered = true;
    cancelAnimationFrame(raf);
    removeEventListener('wheel', onWheel);
    removeEventListener('touchstart', onTouchStart);
    removeEventListener('touchmove', onTouchMove);
    removeEventListener('keydown', onKey);
    status.style.opacity = 0;
    load.style.cursor = '';
    onEnter();                         // 3D starts rendering + camera fly-in starts NOW
    load.classList.add('out');         // text zooms, background fades (CSS)
    setTimeout(() => (load.style.display = 'none'), 1500);
  }

  return {
    setReady() {                       // called by main.js once the .glb models are in
      ready = true;
      status.style.opacity = 0;        // if the user already clicked, tick() calls go() on the next frame
    },
  };
}