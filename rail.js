/* The rail: a scrubbed power-fault scene.
   WebGPU compute-shader current field when available, 2D canvas otherwise.
   The curve is the real fault: 3.3 V boost rail, three SG90 servos, brownout at 2.43 V. */
(function () {
  'use strict';

  var root = document.documentElement;
  function full() { return root.getAttribute('data-motion') !== 'reduced'; }
  var stage = document.getElementById('stage');
  var c2d = document.getElementById('rail');
  var cgpu = document.getElementById('field');
  if (!stage || !c2d) return;

  var NOMINAL = 3.3, THRESHOLD = 2.43, VMAX = 4.0;

  /* ---------- the fault, as a function ---------- */
  function volts(t) {
    if (t < 0.20) return NOMINAL - 0.004 * Math.sin(t * 260);
    if (t < 0.235) return NOMINAL - 0.05;
    if (t < 0.40) {
      var k = (t - 0.235) / 0.055, i = Math.floor(k), f = k - i;
      if (i < 3) return NOMINAL - 0.05 - Math.sin(f * Math.PI) * (0.42 + i * 0.12);
      return NOMINAL - 0.24;
    }
    if (t < 0.46) return (NOMINAL - 0.24) - ((t - 0.40) / 0.06) * 1.35;
    if (t < 0.76) {
      var c = (t - 0.46) / 0.10, n = Math.floor(c), p = c - n;
      if (p < 0.42) return 0.15 + (p / 0.42) * 2.80;
      if (p < 0.62) return 2.95 - ((p - 0.42) / 0.20) * 0.85;
      return Math.max(0.1, 2.10 - ((p - 0.62) / 0.38) * 2.0);
    }
    if (t < 0.80) return 0.12 + ((t - 0.76) / 0.04) * (NOMINAL - 0.12);
    return NOMINAL - 0.003 * Math.sin(t * 300);
  }

  function progress() {
    var r = stage.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(1, -r.top / span));
  }

  /* ---------- 2D layer: the reading ---------- */
  var ctx = c2d.getContext('2d'), W = 0, H = 0, dpr = 1;

  function size2d() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = c2d.clientWidth; H = c2d.clientHeight;
    c2d.width = Math.round(W * dpr); c2d.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function railGeom() {
    /* keep the trace clear of the caption block that grows from the bottom */
    var padX = Math.max(18, W * 0.045);
    var top = H * 0.40, bot = H * 0.72;
    return {
      padX: padX, top: top, bot: bot,
      y: function (v) { return bot - (v / VMAX) * (bot - top); },
      x: function (t) { return padX + t * (W - padX * 2); }
    };
  }

  function draw2d(p) {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    var g = railGeom(), yT = g.y(THRESHOLD);

    ctx.save();
    ctx.setLineDash([2, 7]); ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(212,83,63,' + (p > 0.30 ? 0.55 : 0.14) + ')';
    ctx.beginPath(); ctx.moveTo(g.padX, yT); ctx.lineTo(W - g.padX, yT); ctx.stroke();
    ctx.restore();
    if (p > 0.30) {
      ctx.font = '11px "Martian Mono", ui-monospace, monospace';
      var bl = '2.43 V  BROWNOUT', bw = ctx.measureText(bl).width;
      ctx.fillStyle = 'rgba(8,11,16,.82)';
      ctx.fillRect(g.padX - 5, yT - 20, bw + 10, 15);
      ctx.fillStyle = 'rgba(212,83,63,.9)';
      ctx.fillText(bl, g.padX, yT - 9);
    }

    var N = Math.max(240, Math.floor(W / 2)), i, t;
    ctx.beginPath();
    for (i = 0; i <= N; i++) { t = i / N; i ? ctx.lineTo(g.x(t), g.y(volts(t))) : ctx.moveTo(g.x(t), g.y(volts(t))); }
    ctx.strokeStyle = 'rgba(150,160,175,.10)'; ctx.lineWidth = 1; ctx.stroke();

    var head = Math.max(0.002, p);
    var grad = ctx.createLinearGradient(g.padX, 0, W - g.padX, 0);
    grad.addColorStop(0, 'rgba(152,160,172,.5)');
    grad.addColorStop(Math.min(.98, Math.max(.02, head * 0.55)), 'rgba(192,122,99,.85)');
    grad.addColorStop(Math.min(1, Math.max(.03, head)), p > 0.78 ? '#7fb094' : '#d4533f');
    ctx.beginPath();
    var M = Math.max(2, Math.floor(N * head));
    for (i = 0; i <= M; i++) { t = i / N; i ? ctx.lineTo(g.x(t), g.y(volts(t))) : ctx.moveTo(g.x(t), g.y(volts(t))); }
    ctx.strokeStyle = grad; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();

    var vh = volts(head), hx = g.x(head), hy = g.y(vh);
    ctx.save();
    ctx.globalAlpha = .45; ctx.strokeStyle = 'rgba(152,160,172,.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx, g.top - 14); ctx.lineTo(hx, g.bot); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = vh < THRESHOLD ? '#d4533f' : (p > 0.78 ? '#7fb094' : '#d8944c');
    ctx.fill();
    ctx.font = '12px "Martian Mono", ui-monospace, monospace';
    var lbl = vh.toFixed(2) + ' V', lw = ctx.measureText(lbl).width;
    var lx = Math.min(W - g.padX - lw, hx + 10), ly = Math.max(g.top - 6, hy - 12);
    ctx.fillStyle = 'rgba(8,11,16,.8)';
    ctx.fillRect(lx - 4, ly - 10, lw + 8, 15);
    ctx.fillStyle = vh < THRESHOLD ? 'rgba(212,83,63,.98)' : 'rgba(236,233,226,.92)';
    ctx.fillText(lbl, lx, ly);
  }

  /* ---------- WebGPU layer: the current ---------- */
  var gpu = null;

  var U_STRUCT =
    'struct U { res: vec2<f32>, time: f32, prog: f32, volt: f32, band: f32, dt: f32, pad: f32 };';

  /* compute module: moves the current */
  var WGSL_COMPUTE = [
    'struct P { pos: vec2<f32>, vel: vec2<f32>, seed: f32, pad: f32 };',
    U_STRUCT,
    '@group(0) @binding(0) var<storage, read_write> ps: array<P>;',
    '@group(0) @binding(1) var<uniform> u: U;',
    'fn h11(n: f32) -> f32 { return fract(sin(n * 78.233) * 43758.5453); }',
    '@compute @workgroup_size(64)',
    'fn cmain(@builtin(global_invocation_id) g: vec3<u32>) {',
    '  let i = g.x;',
    '  if (i >= arrayLength(&ps)) { return; }',
    '  var p = ps[i];',
    '  let health = clamp(u.volt, 0.0, 1.0);',
    '  let lane = 0.45 + p.seed * 1.15;',
    '  let speed = mix(14.0, 190.0, health * health) * lane;',
    '  let chaos = mix(98.0, 14.0, health) * (0.6 + p.seed * 0.8);',
    '  let wob = sin(p.pos.x * 0.011 + u.time * 1.7 + p.seed * 6.283) * chaos;',
    /* each particle keeps its own offset from the trace, so a calm rail stays a
       band with depth instead of collapsing into a one pixel wire */
    '  let spread = u.res.y * mix(0.26, 0.075, health);',
    '  let home = u.band + (p.seed - 0.5) * 2.0 * spread;',
    '  let pull = (home - p.pos.y) * mix(0.05, 0.55, health);',
    '  p.vel.x = mix(p.vel.x, speed, 0.09);',
    '  p.vel.y = mix(p.vel.y, wob + pull, 0.07);',
    '  p.pos = p.pos + p.vel * u.dt;',
    '  if (p.pos.x > u.res.x + 14.0) {',
    '    p.pos.x = -14.0 - h11(p.seed * 3.1 + u.time) * u.res.x * 0.32;',
    '    p.pos.y = u.band + (h11(p.seed + u.time * 0.37) - 0.5) * u.res.y * 0.34;',
    '  }',
    '  if (p.pos.y < -30.0) { p.pos.y = u.res.y + 30.0; }',
    '  if (p.pos.y > u.res.y + 30.0) { p.pos.y = -30.0; }',
    '  ps[i] = p;',
    '}'
  ].join('\n');

  /* render module: particles arrive as instanced vertex data, not storage */
  var WGSL_RENDER = [
    U_STRUCT,
    '@group(0) @binding(0) var<uniform> u: U;',
    'struct VO { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) sd: f32 };',
    '@vertex',
    'fn vmain(@builtin(vertex_index) vi: u32,',
    '         @location(0) ipos: vec2<f32>,',
    '         @location(1) ivel: vec2<f32>,',
    '         @location(2) iseed: f32) -> VO {',
    '  var q = array<vec2<f32>, 6>(',
    '    vec2<f32>(-1.0,-1.0), vec2<f32>(1.0,-1.0), vec2<f32>(-1.0,1.0),',
    '    vec2<f32>(-1.0,1.0), vec2<f32>(1.0,-1.0), vec2<f32>(1.0,1.0));',
    '  let c = q[vi];',
    '  let sz = mix(3.4, 1.7, clamp(u.volt, 0.0, 1.0));',
    '  let streak = vec2<f32>(1.0 + clamp(abs(ivel.x) * 0.012, 0.0, 2.6), 1.0);',
    '  let w = ipos + c * sz * streak;',
    '  var o: VO;',
    '  o.pos = vec4<f32>((w / u.res) * vec2<f32>(2.0, -2.0) + vec2<f32>(-1.0, 1.0), 0.0, 1.0);',
    '  o.uv = c; o.sd = iseed;',
    '  return o;',
    '}',
    '@fragment',
    'fn fmain(in: VO) -> @location(0) vec4<f32> {',
    '  let d = 1.0 - clamp(length(in.uv), 0.0, 1.0);',
    '  let a = pow(d, 2.4);',
    '  let bad = vec3<f32>(0.86, 0.30, 0.22);',
    '  let warm = vec3<f32>(0.86, 0.58, 0.30);',
    '  let good = vec3<f32>(0.44, 0.69, 0.57);',
    '  let hv = clamp(u.volt, 0.0, 1.0);',
    '  var col = mix(bad, warm, smoothstep(0.22, 0.78, hv));',
    '  col = mix(col, good, smoothstep(0.82, 1.0, u.prog));',
    '  let flick = 0.75 + 0.25 * sin(u.time * 3.1 + in.sd * 12.0);',
    '  return vec4<f32>(col * a * flick * 0.82, a * 0.44);',
    '}'
  ].join('\n');

  function initGPU() {
    if (!cgpu || !navigator.gpu || !full()) return Promise.resolve(null);
    return navigator.gpu.requestAdapter().then(function (ad) {
      if (!ad) return null;
      return ad.requestDevice().then(function (dev) {
        var fmt = navigator.gpu.getPreferredCanvasFormat();
        var gctx = cgpu.getContext('webgpu');
        if (!gctx) return null;
        gctx.configure({ device: dev, format: fmt, alphaMode: 'premultiplied' });

        var cMod = dev.createShaderModule({ code: WGSL_COMPUTE });
        var rMod = dev.createShaderModule({ code: WGSL_RENDER });

        var cBGL = dev.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
          ]
        });
        var rBGL = dev.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }
          ]
        });
        var cPipe = dev.createComputePipeline({
          layout: dev.createPipelineLayout({ bindGroupLayouts: [cBGL] }),
          compute: { module: cMod, entryPoint: 'cmain' }
        });
        var rPipe = dev.createRenderPipeline({
          layout: dev.createPipelineLayout({ bindGroupLayouts: [rBGL] }),
          vertex: {
            module: rMod, entryPoint: 'vmain',
            buffers: [{
              arrayStride: 24, stepMode: 'instance',
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                { shaderLocation: 1, offset: 8, format: 'float32x2' },
                { shaderLocation: 2, offset: 16, format: 'float32' }
              ]
            }]
          },
          fragment: {
            module: rMod, entryPoint: 'fmain',
            targets: [{
              format: fmt,
              blend: {
                color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }
              }
            }]
          },
          primitive: { topology: 'triangle-list' }
        });

        var uni = dev.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var g = { dev: dev, gctx: gctx, cPipe: cPipe, rPipe: rPipe, cBGL: cBGL, rBGL: rBGL,
                  uni: uni, buf: null, cBG: null, rBG: null, n: 0, lost: false };

        g.rBG = dev.createBindGroup({ layout: rBGL, entries: [{ binding: 0, resource: { buffer: uni } }] });
        dev.lost.then(function () { g.lost = true; });
        dev.addEventListener('uncapturederror', function () { g.lost = true; });
        return g;
      });
    }).catch(function () { return null; });
  }

  function seedParticles(g, w, h) {
    var area = w * h;
    var n = Math.max(6000, Math.min(70000, Math.floor(area / 26)));
    n = Math.floor(n / 64) * 64;
    var data = new Float32Array(n * 6);
    for (var i = 0; i < n; i++) {
      var o = i * 6;
      data[o] = Math.random() * w;
      data[o + 1] = h * (0.28 + Math.random() * 0.62);
      data[o + 2] = 40 + Math.random() * 90;
      data[o + 3] = (Math.random() - 0.5) * 8;
      data[o + 4] = Math.random();
      data[o + 5] = 0;
    }
    if (g.buf) g.buf.destroy();
    g.buf = g.dev.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    g.dev.queue.writeBuffer(g.buf, 0, data);
    g.n = n;
    g.cBG = g.dev.createBindGroup({ layout: g.cBGL, entries: [
      { binding: 0, resource: { buffer: g.buf } }, { binding: 1, resource: { buffer: g.uni } }] });
  }

  function sizeGPU() {
    if (!gpu || gpu.lost || !cgpu) return;
    var w = Math.round(cgpu.clientWidth * dpr), h = Math.round(cgpu.clientHeight * dpr);
    if (!w || !h) return;
    var max = gpu.dev.limits.maxTextureDimension2D || 4096;
    cgpu.width = Math.min(w, max); cgpu.height = Math.min(h, max);
    seedParticles(gpu, cgpu.width, cgpu.height);
  }

  var uArr = new Float32Array(12);
  function drawGPU(p, time, dt) {
    if (!gpu || gpu.lost || !gpu.buf || !cgpu.width) return;
    var vh = volts(Math.max(0.002, p));
    var health = Math.max(0, Math.min(1, vh / NOMINAL));
    var geom = railGeom();
    uArr[0] = cgpu.width; uArr[1] = cgpu.height;
    uArr[2] = time; uArr[3] = p;
    uArr[4] = health; uArr[5] = geom.y(vh) * dpr; uArr[6] = dt; uArr[7] = 0;
    gpu.dev.queue.writeBuffer(gpu.uni, 0, uArr);

    var enc = gpu.dev.createCommandEncoder();
    var cp = enc.beginComputePass();
    cp.setPipeline(gpu.cPipe); cp.setBindGroup(0, gpu.cBG);
    cp.dispatchWorkgroups(Math.ceil(gpu.n / 64)); cp.end();

    var rp = enc.beginRenderPass({
      colorAttachments: [{
        view: gpu.gctx.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear', storeOp: 'store'
      }]
    });
    rp.setPipeline(gpu.rPipe); rp.setBindGroup(0, gpu.rBG);
    rp.setVertexBuffer(0, gpu.buf);
    rp.draw(6, gpu.n); rp.end();
    gpu.dev.queue.submit([enc.finish()]);
  }

  /* ---------- beats ---------- */
  var ident = document.querySelector('.ident');
  var beats = [].slice.call(document.querySelectorAll('.beat'));
  var CUTS = [0.00, 0.155, 0.315, 0.455, 0.60, 0.79];
  var shown = -1;
  function beat(p) {
    var idx = 0;
    for (var i = 0; i < CUTS.length; i++) if (p >= CUTS[i]) idx = i;
    if (idx === shown) return;
    shown = idx;
    for (var j = 0; j < beats.length; j++) beats[j].classList.toggle('on', j === idx);
  }

  /* ---------- loop ---------- */
  var last = 0, running = false, curP = 0, onScreen = true, gpuTried = false, queued = false;

  function paint(p, t, dt) {
    draw2d(p); beat(p);
    if (ident) ident.style.opacity = (1 - Math.max(0, Math.min(1, (p - 0.16) / 0.30)) * 0.88).toFixed(3);
    if (gpu && !gpu.lost && full()) drawGPU(p, t, dt);
  }

  function frame(now) {
    var t = now * 0.001;
    var dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;
    curP = progress();
    paint(curP, t, dt);
    if (running) requestAnimationFrame(frame);
  }

  /* reduced motion: no rAF loop, the scroll position alone drives the trace */
  function onScrollStatic() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function (now) {
      queued = false;
      curP = progress();
      paint(curP, now * 0.001, 0.016);
    });
  }

  function startLoop() {
    if (running) return;
    running = true; last = 0;
    requestAnimationFrame(frame);
  }
  function stopLoop() { running = false; }

  function applyMotion() {
    if (full()) {
      removeEventListener('scroll', onScrollStatic);
      if (!gpuTried) {
        gpuTried = true;
        initGPU().then(function (g) {
          gpu = g;
          if (gpu) { root.classList.add('has-gpu'); sizeGPU(); }
          syncLabel();
        });
      }
      if (onScreen) startLoop();
    } else {
      stopLoop();
      addEventListener('scroll', onScrollStatic, { passive: true });
      onScrollStatic();
    }
  }

  function resizeAll() {
    size2d(); sizeGPU();
    if (!running) onScrollStatic();
  }

  size2d();
  applyMotion();

  addEventListener('resize', resizeAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { paint(curP, 0, 0.016); });

  /* pause the loop when the scene is off screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      if (!full()) return;
      if (onScreen) startLoop(); else stopLoop();
    }, { threshold: 0 }).observe(stage);
  }

  /* the switch */
  var btn = document.getElementById('motionToggle'),
      lbl = document.getElementById('motionLabel'),
      hint = document.getElementById('motionHint');
  function syncLabel() {
    var on = full();
    if (lbl) lbl.textContent = on ? 'Motion on' : 'Motion off';
    if (hint) {
      hint.textContent = on
        ? (gpuTried && !gpu ? '· no webgpu' : '')
        : '· click to run the field';
    }
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = on ? 'Turn the current field off' : 'Turn the current field on';
    }
  }
  if (btn) {
    btn.addEventListener('click', function () {
      var next = full() ? 'reduced' : 'full';
      root.setAttribute('data-motion', next);
      try { localStorage.setItem('motion', next); } catch (e) {}
      syncLabel();
      applyMotion();
    });
  }
  syncLabel();
})();
