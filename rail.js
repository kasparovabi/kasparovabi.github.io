/* The rail: a scrubbed power-fault scene.
   WebGPU compute-shader current field when available, 2D canvas otherwise.
   The curve is the real fault: 3.3 V boost rail, three SG90 servos, brownout at 2.43 V. */
(function () {
  'use strict';

  var root = document.documentElement;
  var root = document.documentElement;
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
    /* keep the band clear of the identity block above it: at 0.40 the top of
       the scatter crossed the headline */
    var top = H * 0.47, bot = H * 0.74;
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
    /* dark under-stroke first: the dashed line alone disappeared into the
       particle field once the glow was on */
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(8,11,16,.72)';
    ctx.beginPath(); ctx.moveTo(g.padX, yT); ctx.lineTo(W - g.padX, yT); ctx.stroke();
    ctx.setLineDash([3, 6]); ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(224,101,79,' + (p > 0.30 ? 0.92 : 0.42) + ')';
    ctx.beginPath(); ctx.moveTo(g.padX, yT); ctx.lineTo(W - g.padX, yT); ctx.stroke();
    ctx.restore();
    /* the field behind these is bright and busy, so the readouts need solid
       plates and a border -- at 0.82 alpha they washed out completely */
    ctx.font = '600 12px "Martian Mono", ui-monospace, monospace';
    var bl = '2.43 V  BROWNOUT', bw = ctx.measureText(bl).width;
    ctx.fillStyle = '#080b10';
    ctx.fillRect(g.padX - 6, yT - 22, bw + 12, 18);
    ctx.strokeStyle = 'rgba(212,83,63,.55)'; ctx.lineWidth = 1;
    ctx.strokeRect(g.padX - 6, yT - 22, bw + 12, 18);
    ctx.fillStyle = p > 0.30 ? '#e0654f' : 'rgba(212,83,63,.62)';
    ctx.fillText(bl, g.padX, yT - 9);

    var N = Math.max(240, Math.floor(W / 2)), i, t;
    /* the trace itself is no longer drawn here: the particles ARE the curve.
       Only the axis furniture (threshold line, labels, playhead) stays 2D. */

    var head = Math.max(0.002, p);
    /* The trace is drawn by the particle field, not here. Without WebGPU there
       would be no curve at all, so the 2D fallback keeps a thin stroke. */
    if (!gpuLive) {
      var grad = ctx.createLinearGradient(g.padX, 0, W - g.padX, 0);
      grad.addColorStop(0, 'rgba(152,160,172,.5)');
      grad.addColorStop(Math.min(.98, Math.max(.02, head * 0.55)), 'rgba(192,122,99,.85)');
      grad.addColorStop(Math.min(1, Math.max(.03, head)), p > 0.78 ? '#7fb094' : '#d4533f');
      ctx.beginPath();
      var M = Math.max(2, Math.floor(N * head));
      for (i = 0; i <= M; i++) { t = i / N; i ? ctx.lineTo(g.x(t), g.y(volts(t))) : ctx.moveTo(g.x(t), g.y(volts(t))); }
      ctx.strokeStyle = grad; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
    }

    var vh = volts(head), hx = g.x(head), hy = g.y(vh);
    ctx.save();
    ctx.globalAlpha = .45; ctx.strokeStyle = 'rgba(152,160,172,.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx, g.top - 14); ctx.lineTo(hx, g.bot); ctx.stroke();
    ctx.restore();
    var hcol = vh < THRESHOLD ? '#e0654f' : (p > 0.78 ? '#7fb094' : '#d8944c');
    /* dark moat first, so the dot separates from the glowing field behind it */
    ctx.beginPath(); ctx.arc(hx, hy, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,11,16,.9)'; ctx.fill();
    ctx.beginPath(); ctx.arc(hx, hy, 5.2, 0, Math.PI * 2);
    ctx.fillStyle = hcol; ctx.fill();
    ctx.beginPath(); ctx.arc(hx, hy, 9.5, 0, Math.PI * 2);
    ctx.strokeStyle = hcol; ctx.lineWidth = 1.4; ctx.globalAlpha = .75;
    ctx.stroke(); ctx.globalAlpha = 1;

    ctx.font = '700 15px "Martian Mono", ui-monospace, monospace';
    var lbl = vh.toFixed(2) + ' V', lw = ctx.measureText(lbl).width;
    var lx = Math.min(W - g.padX - lw, hx + 16), ly = Math.max(g.top - 4, hy - 16);
    ctx.fillStyle = '#080b10';
    ctx.fillRect(lx - 7, ly - 14, lw + 14, 22);
    ctx.strokeStyle = hcol; ctx.lineWidth = 1;
    ctx.strokeRect(lx - 7, ly - 14, lw + 14, 22);
    ctx.fillStyle = hcol;
    ctx.fillText(lbl, lx, ly);
  }

  /* ---------- WebGPU layer: the current ---------- */
  var gpu = null;
  /* true only once the GPU pass has actually drawn; the 2D fallback keys
     off this so a failed init never leaves the scene without a trace */
  var gpuLive = false;

  var U_STRUCT =
    'struct U { res: vec2<f32>, time: f32, prog: f32, volt: f32, band: f32, dt: f32, pad: f32,'
    + ' padX: f32, gtop: f32, gbot: f32, pad2: f32,'
    + ' mouse: vec2<f32>, mAct: f32, pad3: f32 };';

  /* the fault curve, ported to WGSL so every particle can evaluate it at its
     own x. This is what turns the cloud into the trace instead of a band. */
  var WGSL_VOLTS = [
    'fn voltsw(t: f32) -> f32 {',
    '  let NOM = 3.3;',
    '  if (t < 0.20) { return NOM - 0.004 * sin(t * 260.0); }',
    '  if (t < 0.235) { return NOM - 0.05; }',
    '  if (t < 0.40) {',
    '    let k = (t - 0.235) / 0.055; let i = floor(k); let f = k - i;',
    '    if (i < 3.0) { return NOM - 0.05 - sin(f * 3.14159265) * (0.42 + i * 0.12); }',
    '    return NOM - 0.24;',
    '  }',
    '  if (t < 0.46) { return (NOM - 0.24) - ((t - 0.40) / 0.06) * 1.35; }',
    '  if (t < 0.76) {',
    '    let c = (t - 0.46) / 0.10; let n = floor(c); let p = c - n;',
    '    if (p < 0.42) { return 0.15 + (p / 0.42) * 2.80; }',
    '    if (p < 0.62) { return 2.95 - ((p - 0.42) / 0.20) * 0.85; }',
    '    return max(0.1, 2.10 - ((p - 0.62) / 0.38) * 2.0);',
    '  }',
    '  if (t < 0.80) { return 0.12 + ((t - 0.76) / 0.04) * (NOM - 0.12); }',
    '  return NOM - 0.003 * sin(t * 300.0);',
    '}',
    'fn tOfX(x: f32, u: U) -> f32 {',
    '  let span = max(u.res.x - u.padX * 2.0, 1.0);',
    '  return clamp((x - u.padX) / span, 0.0, 1.0);',
    '}',
    'fn yOfV(v: f32, u: U) -> f32 {',
    '  return u.gbot - (v / 4.0) * (u.gbot - u.gtop);',
    '}'
  ].join('\n');

  /* compute module: moves the current */
  var WGSL_COMPUTE = [
    'struct P { pos: vec2<f32>, vel: vec2<f32>, seed: f32, zdep: f32 };',
    U_STRUCT,
    '@group(0) @binding(0) var<storage, read_write> ps: array<P>;',
    '@group(0) @binding(1) var<uniform> u: U;',
    'fn h11(n: f32) -> f32 { return fract(sin(n * 78.233) * 43758.5453); }',
    WGSL_VOLTS,
    '@compute @workgroup_size(64)',
    'fn cmain(@builtin(global_invocation_id) g: vec3<u32>) {',
    '  let i = g.x;',
    '  if (i >= arrayLength(&ps)) { return; }',
    '  var p = ps[i];',
    /* LOCAL voltage at this particle's own x -- this is what makes the cloud
       take the shape of the trace instead of sitting in one flat band */
    '  let tx = tOfX(p.pos.x, u);',
    /* the curve only exists behind the playhead. Ahead of it the field is a
       flat neutral stream, so the fault is WRITTEN by scrolling rather than
       being there from the first frame. */
    '  let form = smoothstep(u.prog + 0.02, u.prog - 0.19, tx);',
    '  let vflat = 3.3;',
    '  let vloc = mix(vflat, voltsw(tx), form);',
    '  let health = clamp(vloc / 3.3, 0.0, 1.0);',
    '  let lane = 0.45 + p.seed * 1.15;',
    '  let spdFlat = 150.0;',
    '  let speed = mix(spdFlat, mix(26.0, 190.0, health * health), form) * lane;',
    '  let chaos = mix(9.0, mix(34.0, 5.0, health), form) * (0.6 + p.seed * 0.8);',
    '  let wob = sin(p.pos.x * 0.011 + u.time * 1.7 + p.seed * 6.283) * chaos;',
    /* tight around the curve when the rail is healthy, blown apart at the dip;
       the spread is a fraction of the plot height, not the viewport */
    '  let plot = max(u.gbot - u.gtop, 1.0);',
    /* unformed stream: a calm wide band. Formed: tight on the curve, blown
       apart only where the rail actually collapses. */
    '  let sprFlat = plot * 0.105;',
    /* scatter must stay small enough that the cloud still reads as the curve.
       At 0.30 the collapse turned into a fog that lost the trace entirely. */
    '  let sprForm = plot * mix(0.115, 0.020, health);',
    '  let spread = mix(sprFlat, sprForm, form);',
    '  let home = yOfV(vloc, u) + (p.seed - 0.5) * 2.0 * spread;',
    /* the pull floor is what lets particles reach the bottom of the dip: at
       0.10 they were swept past the drop horizontally before they could
       descend, so the cloud never went as low as the trace did */
    '  let pull = (home - p.pos.y) * mix(0.06, mix(0.42, 0.80, health), form);',
    '  p.vel.x = mix(p.vel.x, speed, 0.09);',
    '  p.vel.y = mix(p.vel.y, wob + pull, 0.07);',
    /* pointer: particles are pushed out of the cursor and fall back onto the
       curve when it leaves. This is the interaction -- the trace is a fluid
       you can disturb, not a picture of one. */
    '  if (u.mAct > 0.5) {',
    '    let d = p.pos - u.mouse;',
    '    let r = length(d);',
    '    let R = 128.0;',
    '    if (r < R && r > 0.001) {',
    '      let f = (1.0 - r / R);',
    '      p.vel = p.vel + normalize(d) * f * f * 2600.0 * u.dt;',
    '    }',
    '  }',
    /* threshold kick: crossing 2.43 V is the moment the chip resets, so a
       particle passing that line gets thrown. Makes the threshold readable
       as an event rather than a label. */
    '  let yThr = yOfV(2.43, u);',
    '  let before = p.pos.y;',
    '  let after = p.pos.y + p.vel.y * u.dt;',
    '  if (form > 0.35 && ((before - yThr) * (after - yThr)) < 0.0) {',
    '    p.vel.y = p.vel.y + (h11(p.seed * 5.7 + u.time) - 0.5) * 620.0;',
    '    p.vel.x = p.vel.x * 1.22;',
    '  }',
    '  p.pos = p.pos + p.vel * u.dt;',
    '  if (p.pos.x > u.res.x + 14.0) {',
    '    p.pos.x = -14.0 - h11(p.seed * 3.1 + u.time) * u.res.x * 0.32;',
    '    p.pos.y = u.band + (h11(p.seed + u.time * 0.37) - 0.5) * u.res.y * 0.34;',
    '  }',
    '  if (p.pos.y < -30.0) { p.pos.y = u.res.y + 30.0; }',
    '  if (p.pos.y > u.res.y + 30.0) { p.pos.y = -30.0; }',
    /* depth is stable per particle so the field reads as a volume, not noise */
    '  p.zdep = 0.35 + h11(p.seed * 2.3) * 0.65;',
    '  ps[i] = p;',
    '}'
  ].join('\n');

  /* render module: particles arrive as instanced vertex data, not storage */
  var WGSL_RENDER = [
    U_STRUCT,
    '@group(0) @binding(0) var<uniform> u: U;',
    WGSL_VOLTS,
    'struct VO { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>,'
    + ' @location(1) sd: f32, @location(2) lv: f32, @location(3) rev: f32,'
    + ' @location(4) dep: f32, @location(5) glow: f32 };',
    '@vertex',
    'fn vmain(@builtin(vertex_index) vi: u32,',
    '         @location(0) ipos: vec2<f32>,',
    '         @location(1) ivel: vec2<f32>,',
    '         @location(2) iseed: f32,',
    '         @location(3) izdep: f32) -> VO {',
    '  var q = array<vec2<f32>, 6>(',
    '    vec2<f32>(-1.0,-1.0), vec2<f32>(1.0,-1.0), vec2<f32>(-1.0,1.0),',
    '    vec2<f32>(-1.0,1.0), vec2<f32>(1.0,-1.0), vec2<f32>(1.0,1.0));',
    '  let c = q[vi];',
    '  let tx = tOfX(ipos.x, u);',
    '  let form = smoothstep(u.prog + 0.02, u.prog - 0.19, tx);',
    '  let hv = clamp(mix(3.3, voltsw(tx), form) / 3.3, 0.0, 1.0);',
    /* unformed stream stays dim and neutral; the trace brightens as it forms */
    '  let rev = 0.62 + form * 0.38;',
    /* depth: far particles are smaller and dimmer, so the current reads as a
       volume with the trace running through it */
    '  let dep = izdep;',
    '  let persp = mix(0.62, 1.18, dep);',
    '  let sz = mix(3.2, 1.6, hv) * persp;',
    /* motion blur: stretch the quad along the velocity vector. The previous
       position comes from integrating backwards one frame with the same
       velocity, which is exact for this integrator. */
    '  let prev = ipos - ivel * u.dt;',
    '  let mv = ipos - prev;',
    '  let sp = length(mv);',
    '  var fwd = vec2<f32>(1.0, 0.0);',
    '  if (sp > 0.0001) { fwd = mv / sp; }',
    '  let side = vec2<f32>(-fwd.y, fwd.x);',
    '  let stretch = 1.0 + clamp(sp * 0.30, 0.0, 3.4);',
    '  let w = ipos + fwd * c.x * sz * stretch + side * c.y * sz;',
    /* glow only where the rail is actually failing */
/* glow only below the real brownout threshold (2.43/3.3 = 0.736), and only
       once well past it, so the boot loop does not bathe the whole scene */
    '  let glow = smoothstep(0.46, 0.13, hv) * form;',
    '  var o: VO;',
    '  o.dep = dep; o.glow = glow;',
    '  o.pos = vec4<f32>((w / u.res) * vec2<f32>(2.0, -2.0) + vec2<f32>(-1.0, 1.0), 0.0, 1.0);',
    '  o.uv = c; o.sd = iseed; o.lv = hv; o.rev = rev * mix(0.82, 1.0, form);',
    '  return o;',
    '}',
    '@fragment',
    'fn fmain(in: VO) -> @location(0) vec4<f32> {',
    '  let r = clamp(length(in.uv), 0.0, 1.0);',
    '  let d = 1.0 - r;',
    /* conditional bloom: below the brownout threshold the core keeps its size
       but gains a wide soft halo, so the collapse radiates */
    '  let core = pow(d, 2.4);',
    '  let halo = pow(d, 1.35) * in.glow * 0.26;',
    '  let a = core + halo;',
    '  let bad = vec3<f32>(0.86, 0.30, 0.22);',
    '  let warm = vec3<f32>(0.86, 0.58, 0.30);',
    '  let good = vec3<f32>(0.44, 0.69, 0.57);',
    '  let hv = in.lv;',
    '  var col = mix(bad, warm, smoothstep(0.22, 0.78, hv));',
    '  col = mix(col, good, smoothstep(0.82, 1.0, u.prog));',
    '  let flick = 0.75 + 0.25 * sin(u.time * 3.1 + in.sd * 12.0);',
    '  let e = in.rev;',
    /* far particles cool and dim; near ones carry the colour */
    '  let cool = vec3<f32>(0.42, 0.52, 0.62);',
    '  col = mix(cool, col, in.dep * 0.72 + 0.28);',
    '  let dim = mix(0.68, 1.0, in.dep);',
    '  let hot = 1.0 + in.glow * 0.55;',
    '  return vec4<f32>(col * a * flick * 1.25 * e * dim * hot, a * 0.58 * e * dim);',
    '}'
  ].join('\n');

  function initGPU() {
    if (!cgpu || !navigator.gpu) return Promise.resolve(null);
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
                { shaderLocation: 2, offset: 16, format: 'float32' },
                { shaderLocation: 3, offset: 20, format: 'float32' }
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

        /* 16 floats: res(2) time prog volt band dt pad padX gtop gbot pad2 mouse(2) mAct pad3 */
        var uni = dev.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
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
      /* seeded near the plot band; the compute pass pulls them onto the curve */
      data[o + 1] = h * (0.38 + Math.random() * 0.36);
      data[o + 2] = 40 + Math.random() * 90;
      data[o + 3] = (Math.random() - 0.5) * 8;
      data[o + 4] = Math.random();
      data[o + 5] = 0.35 + Math.random() * 0.65;
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

  var uArr = new Float32Array(20);
  function drawGPU(p, time, dt) {
    if (!gpu || gpu.lost || !gpu.buf || !cgpu.width) return;
    var vh = volts(Math.max(0.002, p));
    var health = Math.max(0, Math.min(1, vh / NOMINAL));
    var geom = railGeom();
    uArr[0] = cgpu.width; uArr[1] = cgpu.height;
    uArr[2] = time; uArr[3] = p;
    uArr[4] = health; uArr[5] = geom.y(vh) * dpr; uArr[6] = dt; uArr[7] = 0;
    /* plot geometry in device pixels so the shader can rebuild the curve */
    uArr[8] = geom.padX * dpr; uArr[9] = geom.top * dpr;
    uArr[10] = geom.bot * dpr; uArr[11] = 0;
    uArr[12] = mouse.x * dpr; uArr[13] = mouse.y * dpr;
    uArr[14] = mouse.on ? 1 : 0; uArr[15] = 0;
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
    gpuLive = true;
  }

  /* ---------- pointer ---------- */
  var mouse = { x: -9999, y: -9999, on: false };
  function pointerMove(e) {
    var r = c2d.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    mouse.x = x; mouse.y = y;
    mouse.on = (x >= 0 && y >= 0 && x <= r.width && y <= r.height);
  }
  window.addEventListener('pointermove', pointerMove, { passive: true });
  window.addEventListener('pointerleave', function () { mouse.on = false; }, { passive: true });

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
  var last = 0, running = false, curP = 0, onScreen = true;

  function paint(p, t, dt) {
    draw2d(p); beat(p);
    if (ident) ident.style.opacity = (1 - Math.max(0, Math.min(1, (p - 0.16) / 0.30)) * 0.88).toFixed(3);
    if (gpu && !gpu.lost) drawGPU(p, t, dt);
  }

  function frame(now) {
    var t = now * 0.001;
    var dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;
    curP = progress();
    paint(curP, t, dt);
    if (running) requestAnimationFrame(frame);
  }

  function startLoop() {
    if (running) return;
    running = true; last = 0;
    requestAnimationFrame(frame);
  }
  function stopLoop() { running = false; }
  function resizeAll() {
    size2d(); sizeGPU();
    if (!running) requestAnimationFrame(frame);
  }

  size2d();
  initGPU().then(function (g) {
    gpu = g;
    if (gpu) { root.classList.add('has-gpu'); sizeGPU(); }
  });
  startLoop();

  addEventListener('resize', resizeAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { paint(curP, 0, 0.016); });

  /* pause the loop when the scene is off screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      if (onScreen) startLoop(); else stopLoop();
    }, { threshold: 0 }).observe(stage);
  }
})();
