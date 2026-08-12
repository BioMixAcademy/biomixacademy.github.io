/* BioMix animated background v2 — <biomix-dna-bg>
   The two DNA helices are separated out of the flat artwork: assets/biomix-plate.png is an
   inpainted cover that removes the painted helices (and their haze) from the source image,
   and both helices are then rebuilt as real 3D geometry — point-cloud ribbons + rungs that
   rotate around their own axis, flex, and drift in depth. Everything else in the artwork is
   untouched; the orange rails, hexes and metal keep their sampled light flow.

   <script src="biomix-field.js"></script>
   <script src="biomix-background-v2.js"></script>
   <biomix-dna-bg src="assets/biomix-dna-background-1920x1080.png"
                  plate="assets/biomix-plate.png"></biomix-dna-bg>
*/
(function () {
  if (customElements.get('biomix-dna-bg')) return;

  const DW = 1920, DH = 1080, LOOP = 16, TAU = Math.PI * 2, FOC = 1500;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const gauss = (d, s) => Math.exp(-(d * d) / (2 * s * s));
  const cdist = (d) => Math.abs(((d % 1) + 1.5) % 1 - .5);
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function sprite(stops, size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(s => rg.addColorStop(s[0], s[1]));
    g.fillStyle = rg; g.fillRect(0, 0, size, size);
    return c;
  }

  // axes measured off the artwork so the rebuilt helices sit exactly where the painted ones were
  const HELIX = [
    {
      a: [652, -130], b: [-31, 490], R: 112, turns: 5.6, core: 4.2, rungW: 2.1,
      sMin: -.02, sMax: 1.02, dir: 1, spinPhase: 0,
      floatAmp: 0, floatRot: 0, floatPhase: 0, rate: 1, driftY: 0,
      rungs: 40, fadeIn: .10, fadeOut: .30
    },
    {
      a: [1980, 415], b: [1447, 1135], R: 97, turns: 5.9, core: 3.8, rungW: 1.95,
      sMin: -.02, sMax: 1.02, dir: -1, spinPhase: .37,
      floatAmp: 0, floatRot: 0, floatPhase: 0, rate: 1, driftY: 0,
      rungs: 38, fadeIn: .12, fadeOut: .20
    }
  ];

  // gold rails traced off the artwork's own light paths (bright core measured per bundle)
  const RAIL_PATHS = {
    tl: [[-60, 412], [160, 367], [280, 335], [400, 290], [520, 218], [600, 152], [700, 45], [810, -80]],
    br: [[1268, 1128], [1350, 1012], [1450, 893], [1520, 808], [1600, 732], [1700, 660], [1800, 608], [1930, 560]],
    bl: [[-30, 968], [80, 936], [190, 900], [320, 858], [430, 830]],
    tra: [[1180, 162], [1280, 138], [1380, 116], [1470, 98]],
    trb: [[1740, 178], [1820, 158], [1900, 140], [1965, 128]]
  };
  // depth 0 = behind the DNA (thin, dim, slow) · 1 = mid (sharp) · 2 = front (thicker, softer)
  const RAILS = [
    { p: 'tl', depth: 0, off: -36, w: .50, dir: 1, spd: .8, ph: .13, fib: 0 },
    { p: 'tl', depth: 1, off: -22, w: .78, dir: 1, spd: 1.0, ph: .47, fib: 1 },
    { p: 'tl', depth: 1, off: 0, w: 1.0, dir: 1, spd: 1.0, ph: 0, fib: 2, main: 'tl' },
    { p: 'tl', depth: 2, off: 37, w: .46, dir: 1, spd: 1.15, ph: .72, fib: 0 },
    { p: 'br', depth: 0, off: -19, w: .55, dir: -1, spd: .82, ph: .3, fib: 0 },
    { p: 'br', depth: 1, off: 0, w: 1.0, dir: -1, spd: 1.0, ph: .6, fib: 2, main: 'br' },
    { p: 'br', depth: 2, off: 22, w: .44, dir: -1, spd: 1.12, ph: .05, fib: 1 },
    { p: 'bl', depth: 0, off: 0, w: .34, dir: 1, spd: .7, ph: .55, fib: 0 },
    { p: 'tra', depth: 0, off: 0, w: .30, dir: 1, spd: .9, ph: .2, fib: 0 },
    { p: 'trb', depth: 0, off: 0, w: .30, dir: 1, spd: .9, ph: .8, fib: 0 }
  ];
  // t0 = seconds into the loop, dur = travel time, pow = strength, surge = drives light into the helix
  const COMETS = [
    { rail: 'tl', t0: 0.51, dur: 3.93, pow: 1.00 },
    { rail: 'tl', t0: 6.11, dur: 4.22, pow: .80 },
    { rail: 'tl', t0: 6.87, dur: 3.78, pow: .52 },
    { rail: 'tl', t0: 11.49, dur: 3.64, pow: 1.55, surge: 1 },
    { rail: 'br', t0: 2.76, dur: 4.36, pow: .90 },
    { rail: 'br', t0: 7.85, dur: 3.93, pow: 1.15 },
    { rail: 'br', t0: 12.95, dur: 4.22, pow: .78 },
    { rail: 'br', t0: 13.73, dur: 3.78, pow: .48 }
  ];

  function byZ(a, b) { return a.z - b.z || a.id - b.id; }

  const BL_LINES = [
    { pts: [[-40, 1042], [140, 1000], [330, 942], [500, 872], [640, 790]], c: '11,132,216', hot: '150,210,255', spd: 1, ph: 0 },
    { pts: [[-40, 946], [130, 916], [300, 872], [455, 812], [575, 742]], c: '244,122,24', hot: '255,207,90', spd: 1, ph: .5 }
  ];

  function bez(P, u, off, out) {
    const n = P.length - 1, x = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
    const a = P[i], b = P[i + 1];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    out[0] = a[0] + tx * f + (-ty / l) * off;
    out[1] = a[1] + ty * f + (tx / l) * off;
    return out;
  }

  function catmull(pts, N) {
    const P = [[2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]]].concat(pts,
      [[2 * pts[pts.length - 1][0] - pts[pts.length - 2][0], 2 * pts[pts.length - 1][1] - pts[pts.length - 2][1]]]);
    const segs = P.length - 3, out = new Float32Array((N + 1) * 2);
    for (let i = 0; i <= N; i++) {
      const u = i / N * segs, k = Math.min(segs - 1, Math.floor(u)), f = u - k, f2 = f * f, f3 = f2 * f;
      const p0 = P[k], p1 = P[k + 1], p2 = P[k + 2], p3 = P[k + 3];
      out[i * 2] = .5 * (2 * p1[0] + (-p0[0] + p2[0]) * f + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * f2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * f3);
      out[i * 2 + 1] = .5 * (2 * p1[1] + (-p0[1] + p2[1]) * f + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * f2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * f3);
    }
    return out;
  }


  const mixc = (a, b, t) => 'rgb(' +
    Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
    Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
    Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  const C_BACK = [7, 52, 112], C_FRONT = [24, 158, 240], C_SPEC = [198, 234, 255], C_EDGE = [3, 11, 24];
  const f2 = (v) => Math.round(v * 100) / 100;

  class BioMixDnaBg extends HTMLElement {
    connectedCallback() {
      if (this._built) {                       // re-mounted by the host: resume cleanly
        this._ro.observe(this); this._io.observe(this);
        document.addEventListener('visibilitychange', this._onVis);
        this.layout(); this.tick();
        return;
      }
      this._built = true;
      const root = this.attachShadow({ mode: 'open' });
      const src = this.getAttribute('src') || 'assets/biomix-dna-background-1920x1080.png';
      const plate = this.getAttribute('plate') || 'assets/biomix-plate.png';
      root.innerHTML = `
        <style>
          :host{position:relative;display:block;width:100%;height:100%;overflow:hidden;
                background:#03070D;contain:layout paint;isolation:isolate;}
          .stage{position:absolute;inset:0;}
          .lyr{position:absolute;inset:0;width:100%;height:100%;}
          img.lyr{display:none;}
          .fx{display:block;}
          .stage{animation:bmIn 1.1s ease both;}
          @keyframes bmIn{from{opacity:0}to{opacity:1}}
          .veil{display:none;}
          .guide{display:none;position:absolute;left:25%;top:20.5%;width:50%;height:59%;
                 border:1px dashed rgba(11,132,216,.5);border-radius:8px;}
          :host([guides]) .guide{display:block;}
        </style>
        <div class="stage">
          <img class="lyr base" alt="" draggable="false">
          <img class="lyr plate" alt="" draggable="false">
          <canvas class="lyr fx"></canvas>
          <div class="lyr veil"></div>
          <div class="guide"></div>
        </div>`;

      this.$stage = root.querySelector('.stage');
      this.$base = root.querySelector('.base');
      this.$plate = root.querySelector('.plate');
      this.$cv = root.querySelector('.fx');
      this.$veil = root.querySelector('.veil');
      this.ctx = this.$cv.getContext('2d', { alpha: true });
      this.$base.src = src; this.$plate.src = plate;

      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.touch = matchMedia('(hover: none)').matches;
      this.intensity = parseFloat(this.getAttribute('intensity') || '1');
      this.veilAmt = this.getAttribute('veil') !== null ? parseFloat(this.getAttribute('veil')) : .16;

      this.sp = {
        hot: sprite([[0, 'rgba(214,240,255,1)'], [.18, 'rgba(96,190,255,.8)'], [.5, 'rgba(11,132,216,.26)'], [1, 'rgba(7,86,181,0)']], 64),
        blue: sprite([[0, 'rgba(120,200,255,.95)'], [.3, 'rgba(11,132,216,.5)'], [.62, 'rgba(7,86,181,.16)'], [1, 'rgba(7,86,181,0)']], 64),
        soft: sprite([[0, 'rgba(11,132,216,.7)'], [.45, 'rgba(7,86,181,.22)'], [1, 'rgba(7,86,181,0)']], 64),
        halo: sprite([[0, 'rgba(7,86,181,.5)'], [.4, 'rgba(7,86,181,.16)'], [1, 'rgba(6,20,38,0)']], 96),
        gWhite: sprite([[0, 'rgba(255,248,224,1)'], [.16, 'rgba(255,243,196,.85)'], [.45, 'rgba(255,181,54,.28)'], [1, 'rgba(244,122,24,0)']], 64),
        gGold: sprite([[0, 'rgba(255,225,140,1)'], [.22, 'rgba(255,181,54,.7)'], [.55, 'rgba(244,122,24,.22)'], [1, 'rgba(169,74,8,0)']], 64),
        gAmber: sprite([[0, 'rgba(255,181,54,.9)'], [.3, 'rgba(244,122,24,.5)'], [.62, 'rgba(169,74,8,.18)'], [1, 'rgba(169,74,8,0)']], 64),
        gDeep: sprite([[0, 'rgba(244,122,24,.62)'], [.4, 'rgba(169,74,8,.24)'], [1, 'rgba(169,74,8,0)']], 64)
      };


      this._ro = new ResizeObserver(() => this.layout()); this._ro.observe(this);
      this._io = new IntersectionObserver(es => { this.visible = es[0].isIntersecting; this.tick(); }, { threshold: 0 });
      this._io.observe(this);
      this._onVis = () => this.tick();
      document.addEventListener('visibilitychange', this._onVis);

      this.visible = true; this.t = 0; this.raf = 0;
      this.layout(); this.build();
      this.$plate.onload = () => { this._bgReady = false; };
      if (this.$base.complete) this.start(); else this.$base.onload = () => this.start();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.raf); this.raf = 0;
      this._ro && this._ro.disconnect(); this._io && this._io.disconnect();
      document.removeEventListener('visibilitychange', this._onVis);
    }

    static get observedAttributes() { return ['intensity', 'veil', 'density', 'frozen']; }
    attributeChangedCallback(n, o, v) {
      if (!this._built) return;
      if (n === 'intensity') this.intensity = parseFloat(v || '1');
      if (n === 'veil') this.veilAmt = parseFloat(v || '0');
      if (n === 'density') { this.build(); this.layout(); }
      if (n === 'frozen') this.tick();
      if (this.reduced || this.hasAttribute('frozen')) this.draw(this.t || 2.2);
    }

    tier() {
      const d = this.getAttribute('density');
      if (d === 'low' || d === 'high') return d;
      const w = this.getBoundingClientRect().width || innerWidth;
      const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
      return (this.touch || w < 780 || innerWidth < 780 || weak) ? 'low' : 'high';
    }

    build() {
      const low = this.tier() === 'low';
      this.low = low;
      this.H = HELIX.map((h, hi) => {
        // kept only as the source model for the SVG generator and the rail contacts
        const N = low ? 120 : 200;
        const dx = h.b[0] - h.a[0], dy = h.b[1] - h.a[1], L = Math.hypot(dx, dy);
        const beads = [];
        for (let k = 0; k < (low ? 4 : 7); k++) beads.push({ o: k / (low ? 4 : 7), st: k % 2, w: .6 + hash(hi * 31 + k) * .6 });
        const SEG = low ? 5 : 3, nItems = Math.ceil(N / SEG) * 2 + h.rungs;
        const items = new Array(nItems);
        for (let k = 0; k < nItems; k++) items[k] = { z: 0, st: 0, c: 0, e: 0, i: 0, m: 0, kind: 0, id: k };
        // rest pose — angles and along-axis positions are computed once and never touched
        // again, so every frame is the same rigid body under a rotation
        const c0 = new Float32Array(N + 1), s0 = new Float32Array(N + 1), aL = new Float32Array(N + 1);
        for (let i = 0; i <= N; i++) {
          const sN = h.sMin + (h.sMax - h.sMin) * (i / N);
          const th = TAU * h.turns * sN;
          c0[i] = Math.cos(th); s0[i] = Math.sin(th);
          aL[i] = (sN - .5) * L;
        }
        const rc = new Float32Array(h.rungs), rs = new Float32Array(h.rungs), ra = new Float32Array(h.rungs);
        for (let r = 0; r < h.rungs; r++) {
          const m = (r + .5) / h.rungs, sN = h.sMin + (h.sMax - h.sMin) * m;
          const th = TAU * h.turns * sN;
          rc[r] = Math.cos(th); rs[r] = Math.sin(th); ra[r] = (sN - .5) * L;
        }
        return Object.assign({}, h, {
          N, dx, dy, L, hi, SEG, items, c0, s0, aL, rc, rs, ra,
          rbuf: new Float32Array(h.rungs * 6),
          fadeAt: (m) => {
            const v = h.sMin + (h.sMax - h.sMin) * m;
            return sstep(0, h.fadeIn, v) * sstep(1, 1 - h.fadeOut, v);
          },
          buf: [new Float32Array((N + 1) * 6), new Float32Array((N + 1) * 6)],
          beads
        });
      });
      const F = window.BIOMIX_FIELD;
      if (!F) { clearTimeout(this._w); this._w = setTimeout(() => this.build(), 120); return; }
      const stride = low ? 2 : 1;
      const amb = [];
      for (let i = 0; i < F.amb.length; i += 3 * stride) amb.push({ x: F.amb[i], y: F.amb[i + 1], i: F.amb[i + 2] / 255 });
      this.amb = amb;

      const n = low ? 12 : 26, P = []; let seed = 20260812;
      const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
      for (let k = 0; k < n; k++) {
        const right = rnd() < .5;
        P.push({
          x: right ? 1300 + rnd() * 610 : 10 + rnd() * 610, y: rnd() * DH,
          r: 1 + rnd() * 2, k: rnd() < .65 ? 1 : 2, o: rnd(),
          dx: (rnd() - .5) * 14, dy: (right ? -1 : 1) * (34 + rnd() * 40),
          orange: rnd() < .22, w: .35 + rnd() * .65
        });
      }
      this.parts = P;
      this.buildRails(low);
    }

    buildRails(low) {
      const N = low ? 56 : 96;
      const curves = {};
      for (const k in RAIL_PATHS) curves[k] = catmull(RAIL_PATHS[k], N);
      this.rails = RAILS.map((r, ri) => {
        const base = curves[r.p], pos = new Float32Array((N + 1) * 2), nrm = new Float32Array((N + 1) * 2);
        for (let i = 0; i <= N; i++) {
          const a = Math.max(0, i - 1) * 2, b = Math.min(N, i + 1) * 2;
          let tx = base[b] - base[a], ty = base[b + 1] - base[a + 1];
          const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
          nrm[i * 2] = -ty; nrm[i * 2 + 1] = tx;
        }
        return Object.assign({}, r, { ri, N, base, nrm, pos, seed: hash(ri * 17.3) });
      });
      // where each main rail runs close to a helix axis — used for contact sparks
      this.contacts = [];
      for (const rail of this.rails) {
        if (!rail.main) continue;
        for (let hi = 0; hi < HELIX.length; hi++) {
          const A = HELIX[hi].a, B = HELIX[hi].b;
          let bestU = -1, bestD = 1e9, bestT = 0;
          for (let i = 0; i <= rail.N; i++) {
            const x = rail.base[i * 2], y = rail.base[i * 2 + 1];
            const dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy;
            const t = clamp(((x - A[0]) * dx + (y - A[1]) * dy) / L2, 0, 1);
            const d = Math.hypot(A[0] + dx * t - x, A[1] + dy * t - y);
            if (d < bestD) { bestD = d; bestU = i / rail.N; bestT = t; }
          }
          if (bestD < 220) this.contacts.push({ rail: rail.main, hi, u: bestU, d: bestD, sh: bestT });
        }
      }
      this.gold = [];
      this.buildCorners(low);
    }

    buildCorners(low) {
      const nodes = [], N = low ? 13 : 19;
      for (let i = 0; i < N; i++) {
        const h1 = hash(i * 3.11 + 1), h2 = hash(i * 7.77 + 2), h3 = hash(i * 5.13 + 3);
        nodes.push({ x: 1462 + h1 * 452, y: 10 + h2 * 258, r: 1.4 + h3 * 2, p: h3, g: i % 3 });
      }
      const edges = [];
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (d < 168) edges.push({ a: i, b: j, w: 1 - d / 168, p: hash(i * 13.3 + j * 29.7) });
      }
      edges.sort((p, q) => q.w - p.w);
      this.lat = { nodes, edges: edges.slice(0, low ? 16 : 26) };

      const hex = [], HC = [[146, 905], [232, 951], [188, 1006], [286, 878]];
      for (let k = 0; k < HC.length; k++) {
        const R = 30 + hash(k * 9.4) * 20, pts = [];
        for (let a = 0; a < 6; a++) {
          const th = TAU * (a / 6) + hash(k * 2.7) * .8;
          pts.push([HC[k][0] + Math.cos(th) * R, HC[k][1] + Math.sin(th) * R * .82]);
        }
        hex.push({ pts, p: hash(k * 4.2), r: R });
      }
      this.hexes = hex;

      // slow depth motes, top-right — three speed bands
      const tr = [], TRP = low ? 7 : 12;
      for (let k = 0; k < TRP; k++) {
        const h1 = hash(k * 6.1 + 11), h2 = hash(k * 2.9 + 21), h3 = hash(k * 8.8 + 31);
        tr.push({ x: 1440 + h1 * 470, y: 6 + h2 * 250, r: .9 + h3 * 1.9,
                  k: h3 < .34 ? 1 : h3 < .7 ? 2 : 3, o: h2, dx: -18 - h1 * 34, dy: 10 + h3 * 26 });
      }
      this.trMotes = tr;

      // gold motes rising out of the bottom-left surface
      const bl = [], BLP = low ? 7 : 13;
      for (let k = 0; k < BLP; k++) {
        const h1 = hash(k * 4.7 + 41), h2 = hash(k * 9.3 + 51), h3 = hash(k * 3.3 + 61);
        bl.push({ x: 26 + h1 * 430, y: 1010 + h2 * 66, r: .9 + h3 * 1.6,
                  k: h3 < .5 ? 1 : 2, o: h2, rise: 120 + h3 * 190, sway: 9 + h1 * 16 });
      }
      this.blMotes = bl;
    }

    layout() {
      const r = this.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const low = this.tier() === 'low';
      /* supersample: always render above CSS pixels, even on a 1x display, so the
         helix edges and rails resolve instead of aliasing */
      const res = clamp((window.devicePixelRatio || 1) * 1.4, low ? 1.2 : 1.4, low ? 1.6 : 2.2);
      let cw = Math.round(r.width * res), chh = Math.round(r.height * res);
      /* the stage is full-viewport here, not a 16:9 card — a 1600px cap upscaled
         visibly on wide displays, so allow the real device resolution */
      const MAXW = low ? 1600 : 2560;
      if (cw > MAXW) { const f = MAXW / cw; cw = MAXW; chh = Math.round(chh * f); }
      if (this.$cv.width !== cw || this.$cv.height !== chh) { this.$cv.width = cw; this.$cv.height = chh; }
      this.k = Math.max(cw / DW, chh / DH);                  // design px -> canvas px (cover)
      this.ox = (cw - DW * this.k) * .5;
      this.oy = (chh - DH * this.k) * .5;
      this.cover = this.k; this.q = this.k;

      // every additive light pass renders here, at a fraction of the resolution, then
      // gets blitted up once. glow has no high-frequency detail, so this is free visually
      // and it is what keeps the fill rate inside a 60fps budget.
      /* raised from .34/.42 — at a quarter resolution the upscaled blit was
         visibly blocky once this became a full-viewport background */
      const LQ = low ? .6 : .9;
      const lw = Math.max(640, Math.round(cw * LQ)), lh = Math.max(360, Math.round(chh * LQ));
      if (!this._lit) this._lit = document.createElement('canvas');
      if (this._lit.width !== lw || this._lit.height !== lh) {
        this._lit.width = lw; this._lit.height = lh; this._lc = null; this._veil = null;
      }
      this.lctx = this._lc || (this._lc = this._lit.getContext('2d'));
      this.lk = Math.max(lw / DW, lh / DH);
      this.lox = (lw - DW * this.lk) * .5;
      this.loy = (lh - DH * this.lk) * .5;
      if (this.reduced || this.hasAttribute('frozen')) this.draw(this.t || 2.2);
    }

    start() {
      if (this.reduced) { this.draw(2.2); return; }
      this.last = performance.now(); this.tick();
    }

    tick() {
      cancelAnimationFrame(this.raf);
      const run = this.visible && !document.hidden && !this.reduced && !this.hasAttribute('frozen');
      if (!run) { this.raf = 0; return; }
      this.wall = this.t;
      this.last = performance.now();
      this.wall = this.t;
      this.dtAvg = 1 / 60;
      const loop = (now) => {
        const raw = clamp((now - this.last) / 1000, 0, 1 / 15);
        this.last = now;
        this.wall += raw;
        this.dtAvg += (raw - this.dtAvg) * .06;               // low-pass the frame interval
        let step = this.dtAvg;
        const lag = this.wall - this.t;                       // stay locked to real time
        step += clamp(lag * .08, -this.dtAvg * .5, this.dtAvg * .5);
        this.t += Math.max(step, 0);
        this.draw(this.t);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    draw(t) {
      if (!this.H || !this.rails || !this.ctx || !this.lctx) return;
      const ctx = this.ctx, I = this.intensity;
      const lt = t % LOOP, ph = lt / LOOP;
      const brth = .5 + .5 * Math.sin(TAU * (3 * ph));

      // the plate, the geometry, the arcs and the base lines are pinned: no camera,
      // no zoom, no parallax, no pointer or scroll response anywhere in this frame
      const px = 0, py = 0;
      const K = this.k, OX = this.ox, OY = this.oy;
      const L = this.lctx, LK = this.lk, LOX = this.lox, LOY = this.loy;
      const cam = () => {};

      ctx.setTransform(K, 0, 0, K, OX, OY);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (this._bgReady || this.composeBase()) ctx.drawImage(this._bg, 0, 0, DW, DH);

      L.setTransform(1, 0, 0, 1, 0, 0);
      L.clearRect(0, 0, this._lit.width, this._lit.height);
      L.setTransform(LK, 0, 0, LK, LOX, LOY);
      L.globalCompositeOperation = 'lighter';
      L.globalAlpha = 1;

      this.updateGold(lt, ph);
      for (let i = 0; i < this.H.length; i++) this.computeHelix(this.H[i], t);
      this.occlude();

      this.fog(L, t, I);
      this.cornerTR(L, lt, ph, I);
      this.cornerBL(L, lt, ph, I);
      this.railBand(L, ph, I, 0, 0, 0);                     // rails running behind the helices
      this.ambient(L, ph, I * (.6 + .4 * brth));
      for (let i = 0; i < this.H.length; i++) this.helixGlow(L, this.H[i], I);

      // blit 1 — the soft light that sits behind the structure
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this._lit, 0, 0, this._lit.width, this._lit.height, 0, 0, ctx.canvas.width, ctx.canvas.height);

      // the structure itself, sharp, at full canvas resolution
      ctx.setTransform(K, 0, 0, K, OX, OY);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < this.H.length; i++)
        this.helixCore(ctx, this.H[i], I * (.94 + .06 * (i ? 1 - brth : brth)));

      L.setTransform(1, 0, 0, 1, 0, 0);
      L.clearRect(0, 0, this._lit.width, this._lit.height);
      L.setTransform(LK, 0, 0, LK, LOX, LOY);
      L.globalCompositeOperation = 'lighter';
      L.globalAlpha = 1;
      this.railBand(L, ph, I, 1, 0, 0);
      this.railBand(L, ph, I, 2, 0, 0);
      this.comets(L, I);
      this.sparks(L, lt, I);
      this.particles(L, ph, I, 0, 0);

      // blit 2
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this._lit, 0, 0, this._lit.width, this._lit.height, 0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.setTransform(K, 0, 0, K, OX, OY);
      ctx.globalCompositeOperation = 'source-over';
      if (this.veilAmt > 0) {
        if (!this._veil) {
          const c = document.createElement('canvas');
          c.width = 256; c.height = 144;
          const g = c.getContext('2d');
          g.setTransform(256 / DW, 0, 0, 144 / DH, 0, 0);
          g.translate(DW * .5, DH * .5); g.scale(1, 1.13); g.translate(-DW * .5, -DH * .5);
          const rg = g.createRadialGradient(DW * .5, DH * .5, 0, DW * .5, DH * .5, DW * .5);
          rg.addColorStop(0, 'rgba(3,7,13,.9)');
          rg.addColorStop(.45, 'rgba(3,7,13,.6)');
          rg.addColorStop(.78, 'rgba(3,7,13,0)');
          g.fillStyle = rg; g.fillRect(0, 0, DW, DH);
          this._veil = c;
        }
        ctx.globalAlpha = this.veilAmt;
        ctx.drawImage(this._veil, 0, 0, DW, DH);
      }
      ctx.globalAlpha = 1;
    }

    // One shared phase per helix. Both rails and every rung are evaluated from it in the
    // same frame, so a rung's endpoints are literally the rail points at the same t —
    // they cannot slide, jump or change spacing. Nothing here has a phase of its own.
    computeHelix(H, t) {
      const N = H.N, ph = (t / LOOP) * H.rate;
      const dirx = H.dx / H.L, diry = H.dy / H.L, ppx = -diry, ppy = dirx;
      const cx = H.a[0] + H.dx * .5, cy = H.a[1] + H.dy * .5;
      // one continuous revolution per loop, always the same way round — no stop, no reverse
      const spin = TAU * (H.dir * ph + H.spinPhase);
      const cs = Math.cos(spin), sn = Math.sin(spin);
      const fu = t / (2 * LOOP) + H.floatPhase;             // whole-body float, same for every point
      const fx = H.floatAmp * Math.sin(TAU * fu);
      const fy = H.driftY * (1 - Math.cos(TAU * (t / (2 * LOOP)))) * .5
               + H.floatAmp * .45 * Math.sin(TAU * (fu + .27));
      const fa = H.floatRot * Math.PI / 180 * Math.sin(TAU * (fu + .13));
      const fc = Math.cos(fa), fs = Math.sin(fa);
      // a = axial position (never scaled by perspective, so s_i is locked for all time)
      // u = transverse offset (scaled, which is what produces the 3D turn)
      const put = (arr, o, u, z, a) => {
        const pe = FOC / (FOC - z);
        const rx = dirx * a + ppx * u * pe, ry = diry * a + ppy * u * pe;
        arr[o] = cx + (rx * fc - ry * fs) + fx;
        arr[o + 1] = cy + (rx * fs + ry * fc) + fy;
        arr[o + 2] = z / H.R;
        arr[o + 3] = pe;
      };
      for (let st = 0; st < 2; st++) {
        const buf = H.buf[st], sg = st ? -1 : 1;
        for (let i = 0; i <= N; i++) {
          const cu = sg * H.c0[i], su = sg * H.s0[i];
          put(buf, i * 6, H.R * (cu * cs - su * sn), H.R * (cu * sn + su * cs), H.aL[i]);
        }
        for (let i = 0; i <= N; i++) {
          const a = Math.max(0, i - 1) * 6, b = Math.min(N, i + 1) * 6, o = i * 6;
          let nx = -(buf[b + 1] - buf[a + 1]), ny = buf[b] - buf[a];
          const l = Math.hypot(nx, ny) || 1;
          buf[o + 4] = nx / l; buf[o + 5] = ny / l;
        }
      }
      const rb = H.rbuf, tmp = this._tmp || (this._tmp = new Float32Array(4));
      for (let r = 0; r < H.rungs; r++) {
        const o = r * 6, a = H.ra[r];
        let zc = 0;
        for (let st = 0; st < 2; st++) {
          const sg = st ? -1 : 1;
          const cu = sg * H.rc[r], su = sg * H.rs[r];
          put(tmp, 0, H.R * (cu * cs - su * sn), H.R * (cu * sn + su * cs), a);
          rb[o + st * 2] = tmp[0]; rb[o + st * 2 + 1] = tmp[1];
          zc += tmp[2];
          if (st) rb[o + 5] = tmp[3];
        }
        rb[o + 4] = zc * .5;
      }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let st = 0; st < 2; st++) {
        const buf = H.buf[st];
        for (let i = 0; i <= N; i++) {
          const o = i * 6;
          if (buf[o] < x0) x0 = buf[o]; if (buf[o] > x1) x1 = buf[o];
          if (buf[o + 1] < y0) y0 = buf[o + 1]; if (buf[o + 1] > y1) y1 = buf[o + 1];
        }
      }
      H.bb = [clamp(x0 - 80, 0, DW), clamp(y0 - 80, 0, DH), clamp(x1 + 80, 0, DW), clamp(y1 + 80, 0, DH)];
    }

    // soft halo, in the reduced buffer beneath the sharp structure — never over it
    helixGlow(ctx, H, A) {
      const N = H.N;
      ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([]);
      for (let st = 0; st < 2; st++) {
        const buf = H.buf[st];
        for (let c = 0; c < N; c += 14) {
          const e = Math.min(N, c + 14), om = ((c + e) >> 1) * 6;
          const fd = H.fadeAt((c + e) * .5 / N); if (fd <= .02) continue;
          const dn = clamp(.5 + .5 * buf[om + 2], 0, 1), pe = buf[om + 3];
          ctx.beginPath();
          ctx.moveTo(buf[c * 6], buf[c * 6 + 1]);
          for (let i = c + 1; i <= e; i++) ctx.lineTo(buf[i * 6], buf[i * 6 + 1]);
          ctx.lineWidth = 34 * pe;
          ctx.strokeStyle = 'rgba(7,86,181,' + (A * fd * (.020 + .036 * dn)).toFixed(4) + ')';
          ctx.stroke();
          ctx.lineWidth = 13 * pe;
          ctx.strokeStyle = 'rgba(24,132,222,' + Math.min(A * fd * (.050 + .130 * dn * dn), .16).toFixed(4) + ')';
          ctx.stroke();
        }
      }
    }

    // the sharp structure, painted far-to-near at full canvas resolution
    helixCore(ctx, H, A) {
      const N = H.N, rb = H.rbuf, items = H.items, SEG = H.SEG;
      let n = 0;
      for (let st = 0; st < 2; st++) {
        const buf = H.buf[st];
        for (let c = 0; c < N; c += SEG) {
          const e = Math.min(N, c + SEG), om = ((c + e) >> 1) * 6, it = items[n];
          it.z = buf[om + 2]; it.st = st; it.c = c; it.e = e; it.kind = 0; it.id = n++;
        }
      }
      for (let r = 0; r < H.rungs; r++) {
        const it = items[n];
        it.z = rb[r * 6 + 4]; it.i = r; it.m = (r + .5) / H.rungs; it.kind = 1; it.id = n++;
      }
      items.sort(byZ);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([]);
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        if (it.kind) {
          const o = it.i * 6, fd = H.fadeAt(it.m); if (fd <= .03) continue;
          const dn = clamp(.5 + .5 * it.z, 0, 1), pe = rb[o + 5];
          ctx.beginPath(); ctx.moveTo(rb[o], rb[o + 1]); ctx.lineTo(rb[o + 2], rb[o + 3]);
          ctx.lineWidth = H.rungW * pe;
          ctx.strokeStyle = 'rgb(' + Math.round(14 + 78 * dn) + ',' + Math.round(64 + 118 * dn) + ',' + Math.round(132 + 108 * dn) + ')';
          ctx.globalAlpha = Math.min(A * fd * (.30 + .70 * dn * dn), 1);
          ctx.stroke();
          continue;
        }
        const buf = H.buf[it.st], c = it.c, e = Math.min(N, it.e + 1), om = ((c + it.e) >> 1) * 6;
        const fd = H.fadeAt((c + it.e) * .5 / N); if (fd <= .02) continue;
        const dn = clamp(.5 + .5 * it.z, 0, 1), pe = buf[om + 3], w = H.core * pe;
        ctx.beginPath();
        ctx.moveTo(buf[c * 6], buf[c * 6 + 1]);
        for (let i = c + 1; i <= e; i++) ctx.lineTo(buf[i * 6], buf[i * 6 + 1]);
        // separation pass: deep translucent blue, never black, width and alpha both
        // interpolated by depth so a rail crossing in front reads as a smooth ramp
        ctx.globalAlpha = Math.min(A * fd * (.30 + .70 * dn * dn), 1);
        ctx.lineWidth = w;
        ctx.strokeStyle = 'rgb(' + Math.round(10 + 122 * dn) + ',' + Math.round(58 + 158 * dn) + ',' + Math.round(124 + 131 * dn) + ')';
        ctx.stroke();
        const spec = A * fd * .34 * dn * dn;
        if (spec > .012) {                                  // alpha already ~0 below this
          ctx.globalAlpha = Math.min(spec, .34);
          ctx.lineWidth = w * .3;
          ctx.strokeStyle = '#DCEFFF';
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    composeBase() {
      if (!this.$base.naturalWidth) return false;
      if (!this._bg) { this._bg = document.createElement('canvas'); this._bg.width = DW; this._bg.height = DH; }
      const g = this._bg.getContext('2d');
      g.clearRect(0, 0, DW, DH);
      g.fillStyle = '#03070D';
      g.fillRect(0, 0, DW, DH);
      g.drawImage(this.$base, 0, 0, DW, DH);
      if (this.$plate.naturalWidth) g.drawImage(this.$plate, 0, 0, DW, DH);
      this._bgReady = true;
      return true;
    }

    // ---------- corner scenery: quiet depth, never competing with the helices ----------
    cornerTR(ctx, lt, ph, I) {
      const L = this.lat; if (!L) return;
      ctx.setLineDash([]); ctx.lineCap = 'round';
      for (let e = 0; e < L.edges.length; e++) {
        const E = L.edges[e], a = L.nodes[E.a], b = L.nodes[E.b];
        const br = .5 + .5 * Math.sin(TAU * (ph + E.p));
        const al = I * E.w * (.05 + .13 * br * br);
        if (al < .004) continue;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.lineWidth = 6;
        ctx.strokeStyle = `rgba(7,86,181,${(al * .45).toFixed(4)})`;
        ctx.stroke();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = `rgba(11,132,216,${al.toFixed(4)})`;
        ctx.stroke();
      }
      for (let i = 0; i < L.nodes.length; i++) {
        const n = L.nodes[i];
        const br = .5 + .5 * Math.sin(TAU * (ph * (1 + (n.g === 2 ? 1 : 0)) + n.p));
        const al = I * (.18 + .46 * br * br);
        if (al < .006) continue;
        const rr = n.r * (3.4 + .9 * br);
        ctx.globalAlpha = Math.min(al, .62);
        ctx.drawImage(n.g === 1 ? this.sp.blue : this.sp.soft, n.x - rr, n.y - rr, rr * 2, rr * 2);
      }
      ctx.globalAlpha = 1;

      // thin blue arc sweeping in from beyond the frame
      const cx = 1760, cy = 640, R = 545;                    // arc is fixed
      const a0 = -2.653, a1 = -0.908;
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1);
      ctx.lineWidth = 22;
      ctx.strokeStyle = `rgba(7,86,181,${(I * (.038 + .020 * Math.sin(TAU * ph + 1))).toFixed(4)})`;
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = `rgba(7,86,181,${(I * (.075 + .035 * Math.sin(TAU * ph + 1))).toFixed(4)})`;
      ctx.stroke();
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = `rgba(11,132,216,${(I * (.16 + .08 * Math.sin(TAU * ph + 1))).toFixed(4)})`;
      ctx.stroke();

      // one small gold pulse rides that arc per loop
      const te = lt % LOOP, w0 = 2.4, dur = 3.6;
      if (te > w0 && te < w0 + dur) {
        const p = (te - w0) / dur, env = Math.pow(Math.sin(Math.PI * p), .8);
        const tr = clamp(p + .05 * Math.sin(TAU * p), 0, 1);
        const th = a0 + (a1 - a0) * tr;
        for (let k = 10; k >= 0; k--) {
          const tk = clamp(tr - k * .012, 0, 1), thk = a0 + (a1 - a0) * tk;
          const f = k / 10, al = I * env * Math.pow(1 - f, 1.6) * .46;
          if (al < .006) continue;
          const rr = 7 - 4 * f;
          ctx.globalAlpha = Math.min(al, .7);
          ctx.drawImage(f < .2 ? this.sp.gWhite : f < .55 ? this.sp.gGold : this.sp.gAmber,
            cx + Math.cos(thk) * R - rr, cy + Math.sin(thk) * R - rr, rr * 2, rr * 2);
        }
        ctx.globalAlpha = Math.min(I * env * .5, .8);
        ctx.drawImage(this.sp.gWhite, cx + Math.cos(th) * R - 11, cy + Math.sin(th) * R - 11, 22, 22);
      }

      for (let k = 0; k < this.trMotes.length; k++) {
        const m = this.trMotes[k], f = (ph * m.k + m.o) % 1;
        const al = I * Math.pow(Math.sin(Math.PI * f), 1.5) * (.26 + .34 / m.k);
        if (al < .005) continue;
        const x = m.x + m.dx * (f - .5), y = m.y + m.dy * (f - .5);
        const rr = m.r * (4.2 / Math.sqrt(m.k));
        ctx.globalAlpha = Math.min(al, .55);
        ctx.drawImage(m.k === 1 ? this.sp.blue : this.sp.soft, x - rr, y - rr, rr * 2, rr * 2);
      }
      ctx.globalAlpha = 1;
    }

    cornerBL(ctx, lt, ph, I) {
      const br = .5 + .5 * Math.sin(TAU * ph + .7);
      if (!this._sheen) {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const g = c.getContext('2d');
        const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        rg.addColorStop(0, 'rgba(7,86,181,1)');
        rg.addColorStop(.5, 'rgba(7,86,181,.38)');
        rg.addColorStop(1, 'rgba(6,20,38,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
        this._sheen = c;
      }
      ctx.globalAlpha = clamp(I * (.052 + .032 * br), 0, 1);
      ctx.drawImage(this._sheen, -260, 540, 940, 940);
      ctx.globalAlpha = 1;

      ctx.setLineDash([]);
      for (let k = 0; k < this.hexes.length; k++) {
        const H = this.hexes[k];
        const pulse = .5 + .5 * Math.sin(TAU * (ph * (k % 2 ? 2 : 1) + H.p));
        const al = I * (.030 + .070 * pulse * pulse);
        if (al < .004) continue;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const p = H.pts[i]; i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.closePath();
        ctx.lineWidth = 10;
        ctx.strokeStyle = `rgba(7,86,181,${(al * .40).toFixed(4)})`;
        ctx.stroke();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = `rgba(11,132,216,${al.toFixed(4)})`;
        ctx.stroke();
      }

      // two thin energy lines entering from the edge, fading out well before the centre
      ctx.lineCap = 'round';
      const q0 = this._q0 || (this._q0 = [0, 0]), q1 = this._q1 || (this._q1 = [0, 0]);
      for (let li = 0; li < BL_LINES.length; li++) {
        const L = BL_LINES[li], P = L.pts, SEG = 22;
        for (let sgi = 0; sgi < SEG; sgi++) {
          const u0 = sgi / SEG, u1 = (sgi + 1) / SEG, um = (u0 + u1) * .5;
          const bend = 3.4 * Math.sin(TAU * (um * 1.4 + L.ph));  // fixed curve
          bez(P, u0, bend, q0); bez(P, u1, bend, q1);
          const tail = 1 - sstep(.55, 1, um);
          const flow = gauss(cdist(um - ((ph * L.spd + L.ph) % 1)), .07);
          const al = I * tail * (.062 + .105 * flow);
          if (al < .004) continue;
          ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]);
          ctx.lineWidth = 20;
          ctx.strokeStyle = `rgba(${L.c},${(al * .26).toFixed(4)})`;
          ctx.stroke();
          ctx.lineWidth = 7;
          ctx.strokeStyle = `rgba(${L.c},${(al * .62).toFixed(4)})`;
          ctx.stroke();
          ctx.lineWidth = 2.8;
          ctx.strokeStyle = `rgba(${L.c},${al.toFixed(4)})`;
          ctx.stroke();
          if (flow > .30) {
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = `rgba(${L.hot},${(al * .9 * flow).toFixed(4)})`;
            ctx.stroke();
          }
        }
      }

      for (let k = 0; k < this.blMotes.length; k++) {
        const m = this.blMotes[k], f = (ph * m.k + m.o) % 1;
        const al = I * Math.pow(Math.sin(Math.PI * f), 1.6) * .42;
        if (al < .005) continue;
        const x = m.x + m.sway * Math.sin(TAU * (f + m.o)), y = m.y - m.rise * f;
        const rr = m.r * 3.8;
        ctx.globalAlpha = Math.min(al, .65);
        ctx.drawImage(k % 3 ? this.sp.gAmber : this.sp.gGold, x - rr, y - rr, rr * 2, rr * 2);
      }
      ctx.globalAlpha = 1;
    }

    // ---------- gold rails: layered light paths that breathe, flow and pulse ----------
    railByName(n) { for (const r of this.rails) if (r.main === n) return r; return null; }

    railPoint(r, u, out) {
      const N = r.N, x = clamp(u, 0, 1) * N, i = Math.min(N - 1, Math.floor(x)), f = x - i;
      const a = i * 2, b = a + 2;
      out = out || [0, 0];
      out[0] = r.pos[a] + (r.pos[b] - r.pos[a]) * f;
      out[1] = r.pos[a + 1] + (r.pos[b + 1] - r.pos[a + 1]) * f;
      return out;
    }

    // rail geometry is fixed: resolved once, never re-shaped by time
    updateRails() {
      if (this._railsFixed) return;
      for (const r of this.rails) {
        const N = r.N, s = r.seed;
        for (let i = 0; i <= N; i++) {
          const u = i / N;
          const off = r.off + (3.2 + s * 1.8) * Math.sin(TAU * (1.6 * u + s))
                            + (2.0 + s) * Math.sin(TAU * (2.7 * u + s * 2));
          r.pos[i * 2] = r.base[i * 2] + r.nrm[i * 2] * off;
          r.pos[i * 2 + 1] = r.base[i * 2 + 1] + r.nrm[i * 2 + 1] * off;
        }
      }
      this._railsFixed = true;
    }

    updateGold(lt, ph) {
      this.updateRails();
      const G = [], surge = {};
      for (let i = 0; i < COMETS.length; i++) {
        const C = COMETS[i], rail = this.railByName(C.rail);
        if (!rail) continue;
        const te = ((lt - C.t0) % LOOP + LOOP) % LOOP;
        if (te >= C.dur) continue;
        const p = te / C.dur;
        // non-uniform travel: eases in, surges, relaxes — never stalls or snaps
        const trav = clamp(p + .055 * Math.sin(TAU * 2 * p) - .035 * Math.sin(TAU * p), 0, 1);
        const u = rail.dir > 0 ? trav : 1 - trav;
        const env = Math.pow(Math.sin(Math.PI * p), .5);
        const pt = this.railPoint(rail, u);
        G.push({ x: pt[0], y: pt[1], u, rail, dir: rail.dir, pow: C.pow * env, surge: C.surge });
        if (C.surge) {
          for (const c of this.contacts) {
            if (c.rail !== C.rail) continue;
            const adv = (u - c.u) * rail.dir;                 // how far past the helix the pulse is
            if (adv < -.02 || adv > .5) continue;
            const a = Math.exp(-Math.max(0, adv) / .14) * env;
            const cur = surge[c.hi];
            if (!cur || a > cur.a) surge[c.hi] = { a, u0: c.sh, adv: Math.max(0, adv) * 1.9 };
          }
        }
      }
      this.gold = G; this.surgeAt = surge;
    }

    goldAt(x, y) {
      const g = this.gold; let m = 0;
      for (let i = 0; i < g.length; i++) {
        const dx = g[i].x - x, dy = g[i].y - y, d2 = dx * dx + dy * dy;
        if (d2 > 130000) continue;
        const v = g[i].pow * Math.exp(-d2 / 33000);
        if (v > m) m = v;
      }
      return m;
    }

    occlude() {
      const GW = 64, GH = 36;
      const g = this._occ || (this._occ = new Float32Array(GW * GH));
      g.fill(0);
      for (const H of this.H) for (let st = 0; st < 2; st++) {
        const buf = H.buf[st];
        for (let i = 0; i <= H.N; i += 2) {
          const o = i * 6;
          const gx = (buf[o] / DW * GW) | 0, gy = (buf[o + 1] / DH * GH) | 0;
          if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
          const v = .35 + .65 * clamp(.5 + .5 * buf[o + 2], 0, 1), k = gy * GW + gx;
          if (g[k] < v) g[k] = v;
        }
      }
    }

    occAt(x, y) {
      const GW = 64, GH = 36, g = this._occ;
      if (!g) return 0;
      const gx = (x / DW * GW) | 0, gy = (y / DH * GH) | 0;
      if (gx < 1 || gy < 1 || gx >= GW - 1 || gy >= GH - 1) return 0;
      const k = gy * GW + gx;
      return (g[k] * 2 + g[k - 1] + g[k + 1] + g[k - GW] + g[k + GW]) / 6;
    }

    railBand(ctx, ph, I, depth, ox, oy) {
      ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([]);
      const K = this.low ? 14 : 12;
      for (const r of this.rails) {
        if (r.depth !== depth) continue;
        const N = r.N, wide = depth === 2 ? 1.35 : depth === 0 ? .8 : 1;
        const dim = depth === 2 ? .8 : depth === 0 ? .55 : 1;
        for (let c = 0; c < N; c += K) {
          const e = Math.min(N, c + K), m = (c + e) * .5 / N, om = Math.round((c + e) * .5) * 2;
          const mx = r.pos[om] + ox, my = r.pos[om + 1] + oy;
          const dc = Math.hypot((mx - 960) / 620, (my - 540) / 360);
          const guard = sstep(.95, 1.25, dc);                  // stay off the content area
          if (guard <= .02) continue;
          let E = .5 + .18 * Math.sin(TAU * (1.5 * m + r.ph));   // fixed along the rail
          const g = this.gold;
          for (let k = 0; k < g.length; k++) {
            if (g[k].rail.p !== r.p) continue;
            E += g[k].pow * gauss(m - g[k].u, .085) * (g[k].rail === r ? 1.7 : .7);
          }
          const occ = depth === 2 ? 1 : 1 - this.occAt(mx, my) * (depth === 0 ? .82 : .38);
          const f = I * r.w * dim * guard * occ;
          if (f < .01) continue;
          ctx.beginPath();
          ctx.moveTo(r.pos[c * 2] + ox, r.pos[c * 2 + 1] + oy);
          for (let i = c + 1; i <= e; i++) ctx.lineTo(r.pos[i * 2] + ox, r.pos[i * 2 + 1] + oy);
          ctx.lineWidth = 32 * wide * r.w;
          ctx.strokeStyle = `rgba(169,74,8,${(f * (.016 + .020 * E)).toFixed(4)})`;
          ctx.stroke();
          ctx.lineWidth = 11.5 * wide * r.w;
          ctx.strokeStyle = `rgba(244,122,24,${(f * (.026 + .046 * E)).toFixed(4)})`;
          ctx.stroke();
          ctx.lineWidth = 4.6 * wide * r.w;
          ctx.strokeStyle = `rgba(255,181,54,${(f * (.042 + .105 * E)).toFixed(4)})`;
          ctx.stroke();
          if (depth) {
            ctx.lineWidth = 2.0 * wide * r.w;
            ctx.strokeStyle = `rgba(255,207,90,${(f * (.045 + .140 * E)).toFixed(4)})`;
            ctx.stroke();
            if (E > .78) {
              ctx.lineWidth = 1.0 * wide * r.w;
              ctx.strokeStyle = `rgba(255,243,196,${(f * .15 * (E - .78)).toFixed(4)})`;
              ctx.stroke();
            }
          }
        }
      }
      ctx.setLineDash([]);
    }

    comets(ctx, I) {
      const sp = this.sp, T = this.low ? 12 : 20, pt = [0, 0];
      for (const g of this.gold) {
        for (let k = T; k >= 0; k--) {
          const u = g.u - g.dir * (k * .0075 * (1 + k * .05));
          if (u < -.02 || u > 1.02) continue;
          this.railPoint(g.rail, u, pt);
          const dc = Math.hypot((pt[0] - 960) / 620, (pt[1] - 540) / 360);
          const guard = sstep(.95, 1.25, dc);
          const f = k / T;
          const a = I * g.pow * Math.pow(1 - f, 1.7) * .5 * guard;
          if (a < .015) continue;
          const rad = (11 - 7 * f) * (.85 + g.pow * .35);
          ctx.globalAlpha = Math.min(a, .9);
          ctx.drawImage(f < .12 ? sp.gWhite : f < .35 ? sp.gGold : f < .65 ? sp.gAmber : sp.gDeep,
            pt[0] - rad, pt[1] - rad, rad * 2, rad * 2);
        }
        const dcH = Math.hypot((g.x - 960) / 620, (g.y - 540) / 360);
        const gh = sstep(.95, 1.25, dcH);
        const hr = 20 * (.8 + g.pow * .5);
        ctx.globalAlpha = Math.min(I * g.pow * .55 * gh, .9);
        ctx.drawImage(sp.gWhite, g.x - hr, g.y - hr, hr * 2, hr * 2);
      }
      // a small spark where a pulse meets a helix — never an explosion
      for (const c of this.contacts) {
        for (const g of this.gold) {
          if (g.rail.main !== c.rail) continue;
          const near = gauss(g.u - c.u, .035);
          if (near < .05) continue;
          this.railPoint(g.rail, c.u, pt);
          const rr = 13 * (.6 + near);
          ctx.globalAlpha = Math.min(I * near * g.pow * .5, .8);
          ctx.drawImage(sp.gWhite, pt[0] - rr, pt[1] - rr, rr * 2, rr * 2);
          ctx.globalAlpha = Math.min(I * near * g.pow * .3, .6);
          ctx.drawImage(sp.hot, pt[0] - rr * 1.6, pt[1] - rr * 1.6, rr * 3.2, rr * 3.2);
        }
      }
      ctx.globalAlpha = 1;
    }

    // gold motes that peel off the rails, drift on and fade out
    sparks(ctx, lt, I) {
      const n = this.low ? 10 : 22, pt = [0, 0], sp = this.sp;
      for (let k = 0; k < n; k++) {
        const h1 = hash(k * 3.77), h2 = hash(k * 8.13 + 4), h3 = hash(k * 5.31 + 9);
        const r = this.rails[Math.floor(h1 * this.rails.length) % this.rails.length];
        const life = 1.2 + h2 * 1.1, t0 = h3 * LOOP;
        const age = ((lt - t0) % LOOP + LOOP) % LOOP;
        if (age > life) continue;
        const f = age / life, u = clamp(.12 + h2 * .74 + r.dir * f * .045, 0, 1);
        this.railPoint(r, u, pt);
        const i = Math.min(r.N, Math.round(u * r.N)) * 2;
        const side = h1 > .5 ? 1 : -1, drift = (10 + h3 * 26) * f;
        const x = pt[0] + r.nrm[i] * side * drift, y = pt[1] + r.nrm[i + 1] * side * drift - 6 * f;
        const dc = Math.hypot((x - 960) / 620, (y - 540) / 360);
        const a = I * Math.pow(Math.sin(Math.PI * f), 1.5) * (.22 + h1 * .3) * r.w * sstep(.95, 1.25, dc);
        if (a < .006) continue;
        const rr = 2.2 + h3 * 2.6;
        ctx.globalAlpha = Math.min(a, .8);
        ctx.drawImage(h3 > .6 ? sp.gGold : sp.gAmber, x - rr, y - rr, rr * 2, rr * 2);
      }
      ctx.globalAlpha = 1;
    }

    ambient(ctx, ph, A) {
      const pts = this.amb, sp = this.sp.soft;
      for (let k = 0; k < pts.length; k++) {
        const P = pts[k];
        const a = P.i * A * (.06 + .13 * (.5 + .5 * Math.sin(TAU * (ph * 2 + P.x * .0021 + P.y * .0013))));
        if (a < .008) continue;
        const r = 3 + 5 * a;
        ctx.globalAlpha = Math.min(a, .5);
        ctx.drawImage(sp, P.x - r, P.y - r, r * 2, r * 2);
      }
    }

    particles(ctx, ph, A, ox, oy) {
      const P = this.parts;
      for (let k = 0; k < P.length; k++) {
        const p = P[k], f = (ph * .5 * p.k + p.o) % 1;
        const x = p.x + p.dx * Math.sin(TAU * (ph * .5 + p.o));
        const y = p.y + p.dy * (f - .5);
        const cx = (x - 960) / 700, cy = (y - 540) / 420;
        const edge = sstep(.82, 1.25, Math.sqrt(cx * cx + cy * cy));
        const a = Math.pow(Math.sin(Math.PI * f), 1.4) * .38 * p.w * A * edge;
        if (a < .006) continue;
        const r = p.r * 2.6;
        ctx.globalAlpha = a;
        ctx.drawImage(p.orange ? this.sp.gAmber : this.sp.soft, x - r, y - r, r * 2, r * 2);
      }
    }

    // very soft blue-black depth haze — baked once, then blitted with a slow drift
    fog(ctx, t, A) {
      if (!this._fog) {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 144;
        const g = c.getContext('2d');
        const blobs = [[210, 260, 560], [1730, 830, 580]];
        g.setTransform(256 / DW, 0, 0, 144 / DH, 0, 0);
        for (let i = 0; i < blobs.length; i++) {
          const [bx, by, br] = blobs[i];
          const rg = g.createRadialGradient(bx, by, 0, bx, by, br);
          rg.addColorStop(0, 'rgba(6,20,38,1)');
          rg.addColorStop(.42, 'rgba(6,20,38,.38)');
          rg.addColorStop(1, 'rgba(6,20,38,0)');
          g.fillStyle = rg;
          g.fillRect(bx - br, by - br, br * 2, br * 2);
        }
        this._fog = c;
      }
      const u = t / (2 * LOOP);                               // 32s drift, 3px, closes exactly
      const dx = 3 * Math.sin(TAU * u), dy = 2.2 * Math.cos(TAU * u);
      ctx.globalAlpha = clamp((.045 + .012 * Math.sin(TAU * (u + .3))) * A, 0, 1);
      ctx.drawImage(this._fog, dx, dy, DW, DH);
      ctx.globalAlpha = 1;
    }

    hexScan(ctx, ph, A) {
      if (!this._scan) {
        const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
        this._scan = mk(256, 144); this._mask = mk(256, 144);
        const mg = this._mask.getContext('2d');
        const rg = mg.createRadialGradient(128, 72, 20, 128, 72, 150);
        rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(.42, 'rgba(0,0,0,.12)');
        rg.addColorStop(.8, 'rgba(0,0,0,.85)'); rg.addColorStop(1, 'rgba(0,0,0,1)');
        mg.fillStyle = rg; mg.fillRect(0, 0, 256, 144);
      }
      const s = this._scan.getContext('2d'), SW = 256, SH = 144;
      const hw = .22, c = -hw + (ph % 1) * (1 + 2 * hw);
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.globalCompositeOperation = 'source-over';
      s.clearRect(0, 0, SW, SH);
      const g = s.createLinearGradient((c - hw) * SW, (c - hw) * SH, (c + hw) * SW, (c + hw) * SH);
      g.addColorStop(0, 'rgba(7,86,181,0)');
      g.addColorStop(.5, 'rgba(11,132,216,1)');
      g.addColorStop(1, 'rgba(7,86,181,0)');
      s.fillStyle = g; s.fillRect(0, 0, SW, SH);
      s.globalCompositeOperation = 'destination-in';
      s.drawImage(this._mask, 0, 0);
      s.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = .06 * A;
      ctx.drawImage(this._scan, 0, 0, DW, DH);
    }

    metallic(ctx, ph, A, brth) {
      const bars = [[250, 360, 420, .9], [1648, 250, 400, .8], [1500, 640, 330, .55], [120, 700, 300, .5]];
      for (let i = 0; i < bars.length; i++) {
        const [bx, by, bh, w] = bars[i];
        const f = (ph + i * .27) % 1, y = by + f * bh * 1.1 - bh * .05;
        const g = ctx.createLinearGradient(0, y - 130, 0, y + 130);
        const a = (.09 * w * A * (.6 + .4 * brth) * Math.sin(Math.PI * f)).toFixed(3);
        g.addColorStop(0, 'rgba(11,132,216,0)');
        g.addColorStop(.5, `rgba(11,132,216,${a})`);
        g.addColorStop(1, 'rgba(11,132,216,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = g;
        ctx.fillRect(bx - 62, y - 130, 124, 260);
      }
    }
  }

  customElements.define('biomix-dna-bg', BioMixDnaBg);
})();
