/* Portrait scene: the photograph is not shown, it is assembled.
   Pixels become particles, scattered at first, pulled into place as you scroll.
   WebGPU when available; otherwise the plain image. */
(function () {
  'use strict';

  var root = document.documentElement;
  /* the photo stays as the fallback when WebGPU is missing */

  var stage = document.getElementById('portrait');
  var cv = document.getElementById('pfield');
  var img = document.getElementById('pimg');
  if (!stage || !cv || !img) return;

  var dpr = 1, W = 0, H = 0;
  var gpu = null, tried = false, running = false, onScreen = false, last = 0;
  var samples = null, srcImg = null;

  /* Reading pixels back needs a same-origin image. Over file:// a plain <img> taints
     the canvas, so sampling uses a small inlined copy instead. */
  function loadSource() {
    return new Promise(function (res) {
      var d = window.__CROSSWALK_SRC;
      if (!d) {
        if (img.complete && img.naturalWidth) res(img);
        else img.addEventListener('load', function () { res(img); }, { once: true });
        return;
      }
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(img.naturalWidth ? img : null); };
      im.src = d;
    });
  }

  function progress() {
    var r = stage.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(1, -r.top / span));
  }
  function gatherAt(p) {
    var t = Math.max(0, Math.min(1, (p - 0.04) / 0.56));
    return t * t * (3 - 2 * t);
  }

  /* ---------- turn the photo into points ---------- */
  function samplePhoto(image) {
    var narrow = Math.min(window.innerWidth, window.innerHeight) < 640;
    var gw = narrow ? 132 : 246;
    var gh = Math.round(gw * (image.naturalHeight / image.naturalWidth));
    var oc = document.createElement('canvas');
    oc.width = gw; oc.height = gh;
    var octx = oc.getContext('2d', { willReadFrequently: true });
    octx.drawImage(image, 0, 0, gw, gh);
    var px;
    try { px = octx.getImageData(0, 0, gw, gh).data; } catch (e) { return null; }

    var n = gw * gh;
    var arr = new Float32Array(n * 10);
    var k = 0;
    for (var y = 0; y < gh; y++) {
      for (var x = 0; x < gw; x++) {
        var i = (y * gw + x) * 4;
        var r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
        var o = k * 10;
        arr[o] = Math.random() * 2 - 0.5;            /* pos, filled on first frame */
        arr[o + 1] = Math.random() * 2 - 0.5;
        arr[o + 2] = 0; arr[o + 3] = 0;              /* vel */
        arr[o + 4] = (x + 0.5) / gw;                 /* target, normalised */
        arr[o + 5] = (y + 0.5) / gh;
        arr[o + 6] = r; arr[o + 7] = g; arr[o + 8] = b;
        arr[o + 9] = Math.random();                  /* seed */
        k++;
      }
    }
    return { data: arr, count: n, grid: gw, aspect: image.naturalWidth / image.naturalHeight };
  }

  var WGSL_C = [
    'struct Q { pos: vec2<f32>, vel: vec2<f32>, tgt: vec2<f32>, cr: f32, cg: f32, cb: f32, seed: f32 };',
    'struct U { res: vec2<f32>, origin: vec2<f32>, size: vec2<f32>, time: f32, gather: f32, dt: f32, born: f32, grid: f32, p3: f32 };',
    '@group(0) @binding(0) var<storage, read_write> qs: array<Q>;',
    '@group(0) @binding(1) var<uniform> u: U;',
    'fn h11(n: f32) -> f32 { return fract(sin(n * 78.233) * 43758.5453); }',
    '@compute @workgroup_size(64)',
    'fn cmain(@builtin(global_invocation_id) g: vec3<u32>) {',
    '  let i = g.x;',
    '  if (i >= arrayLength(&qs)) { return; }',
    '  var q = qs[i];',
    '  let home = u.origin + q.tgt * u.size;',
    '  let scatter = vec2<f32>(h11(q.seed * 12.9) * u.res.x,',
    '                          h11(q.seed * 78.2 + 4.1) * u.res.y);',
    '  if (u.born < 0.5) { q.pos = scatter; }',
    '  let k = clamp(u.gather, 0.0, 1.0);',
    '  let drift = vec2<f32>(sin(u.time * 0.9 + q.seed * 31.0), cos(u.time * 0.75 + q.seed * 17.0))',
    '              * mix(34.0, 0.9, k);',
    '  let want = mix(scatter, home, k) + drift;',
    '  q.vel = mix(q.vel, (want - q.pos) * mix(1.4, 5.2, k), 0.16);',
    '  q.pos = q.pos + q.vel * u.dt;',
    '  qs[i] = q;',
    '}'
  ].join('\n');

  var WGSL_R = [
    'struct U { res: vec2<f32>, origin: vec2<f32>, size: vec2<f32>, time: f32, gather: f32, dt: f32, born: f32, grid: f32, p3: f32 };',
    '@group(0) @binding(0) var<uniform> u: U;',
    'fn h11(n: f32) -> f32 { return fract(sin(n * 78.233) * 43758.5453); }',
    'struct VO { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) col: vec3<f32>, @location(2) sd: f32, @location(3) edge: f32 };',
    '@vertex',
    'fn vmain(@builtin(vertex_index) vi: u32,',
    '         @location(0) ipos: vec2<f32>,',
    '         @location(1) icol: vec3<f32>,',
    '         @location(2) iseed: f32) -> VO {',
    '  var quad = array<vec2<f32>, 6>(',
    '    vec2<f32>(-1.0,-1.0), vec2<f32>(1.0,-1.0), vec2<f32>(-1.0,1.0),',
    '    vec2<f32>(-1.0,1.0), vec2<f32>(1.0,-1.0), vec2<f32>(1.0,1.0));',
    '  let c = quad[vi];',
    '  let k = clamp(u.gather, 0.0, 1.0);',
    '  let cell = max(u.size.x / u.grid, 1.0);',
    /* splats vary in size and overlap, the way a gaussian cloud does */
    '  let vary = 0.62 + h11(iseed * 5.31) * 1.05;',
    '  let sz = mix(2.6, cell * 1.75 * vary, k);',
    '  var o: VO;',
    '  let w = ipos + c * sz;',
    '  o.pos = vec4<f32>((w / u.res) * vec2<f32>(2.0, -2.0) + vec2<f32>(-1.0, 1.0), 0.0, 1.0);',
    '  o.uv = c; o.col = icol; o.sd = iseed;',
    /* radial falloff instead of a rectangular crop: the middle stays, the edges dissolve */
    '  let box = (ipos - u.origin) / max(u.size, vec2<f32>(1.0, 1.0));',
    '  let rad = length((box - vec2<f32>(0.5, 0.5)) * vec2<f32>(1.24, 0.80)) * 2.0;',
    '  o.edge = 1.0 - smoothstep(0.58, 1.05, rad);',
    '  return o;',
    '}',
    '@fragment',
    'fn fmain(in: VO) -> @location(0) vec4<f32> {',
    /* a real gaussian, not a cone: soft overlapping splats */
    '  let r2 = dot(in.uv, in.uv);',
    '  let k = clamp(u.gather, 0.0, 1.0);',
    '  let a = exp(-r2 * mix(5.5, 3.4, k));',
    '  let lum = dot(in.col, vec3<f32>(0.299, 0.587, 0.114));',
    '  let warm = vec3<f32>(0.88, 0.66, 0.42);',
    '  var col = mix(mix(vec3<f32>(lum), in.col, 0.55), in.col, k);',
    '  col = mix(col * warm * 1.5, col, mix(0.25, 0.94, k));',
    '  let vig = mix(1.0, in.edge, k);',
    '  let fade = mix(0.5, 1.0, k) * vig;',
    '  let alpha = a * fade * mix(0.5, 0.92, k);',
    '  return vec4<f32>(col * alpha, alpha);',
    '}'
  ].join('\n');

  function initGPU() {
    if (!navigator.gpu) return Promise.resolve(null);
    return navigator.gpu.requestAdapter().then(function (ad) {
      if (!ad) return null;
      return ad.requestDevice().then(function (dev) {
        var fmt = navigator.gpu.getPreferredCanvasFormat();
        var gctx = cv.getContext('webgpu');
        if (!gctx) return null;
        gctx.configure({ device: dev, format: fmt, alphaMode: 'premultiplied' });
        var cMod = dev.createShaderModule({ code: WGSL_C });
        var rMod = dev.createShaderModule({ code: WGSL_R });
        var cBGL = dev.createBindGroupLayout({ entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }] });
        var rBGL = dev.createBindGroupLayout({ entries: [
          { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }] });
        var uni = dev.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        var g = {
          dev: dev, gctx: gctx, uni: uni, lost: false, buf: null, n: 0, born: 0,
          cBGL: cBGL, rBGL: rBGL,
          cPipe: dev.createComputePipeline({
            layout: dev.createPipelineLayout({ bindGroupLayouts: [cBGL] }),
            compute: { module: cMod, entryPoint: 'cmain' } }),
          rPipe: dev.createRenderPipeline({
            layout: dev.createPipelineLayout({ bindGroupLayouts: [rBGL] }),
            vertex: { module: rMod, entryPoint: 'vmain', buffers: [{
              arrayStride: 40, stepMode: 'instance', attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                { shaderLocation: 1, offset: 24, format: 'float32x3' },
                { shaderLocation: 2, offset: 36, format: 'float32' }] }] },
            /* splats composite, they do not add: additive blows the highlights out */
            fragment: { module: rMod, entryPoint: 'fmain', targets: [{ format: fmt, blend: {
              color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }] },
            primitive: { topology: 'triangle-list' } })
        };
        g.rBG = dev.createBindGroup({ layout: rBGL, entries: [{ binding: 0, resource: { buffer: uni } }] });
        dev.lost.then(function () { g.lost = true; });
        dev.addEventListener('uncapturederror', function () { g.lost = true; });
        return g;
      });
    }).catch(function () { return null; });
  }

  function upload() {
    if (!gpu || gpu.lost || !samples) return;
    if (gpu.buf) gpu.buf.destroy();
    gpu.buf = gpu.dev.createBuffer({
      size: samples.data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    gpu.dev.queue.writeBuffer(gpu.buf, 0, samples.data);
    gpu.n = samples.count;
    gpu.born = 0;
    gpu.cBG = gpu.dev.createBindGroup({ layout: gpu.cBGL, entries: [
      { binding: 0, resource: { buffer: gpu.buf } }, { binding: 1, resource: { buffer: gpu.uni } }] });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!gpu || gpu.lost) return;
    var max = gpu.dev.limits.maxTextureDimension2D || 4096;
    cv.width = Math.min(Math.round(W * dpr), max);
    cv.height = Math.min(Math.round(H * dpr), max);
  }

  var uArr = new Float32Array(16);
  function draw(p, t, dt) {
    if (!gpu || gpu.lost || !gpu.buf || !cv.width) return;
    var cw = cv.width, ch = cv.height;
    var boxH = ch * 0.80, boxW = boxH * samples.aspect;
    if (boxW > cw * 0.90) { boxW = cw * 0.90; boxH = boxW / samples.aspect; }
    /* on a wide screen sit the portrait right of centre so the caption has its own room */
    var wide = cw / ch > 1.25;
    var ox = wide ? cw * 0.60 - boxW / 2 : (cw - boxW) / 2;
    ox = Math.max(cw * 0.04, Math.min(ox, cw * 0.96 - boxW));
    uArr[0] = cw; uArr[1] = ch;
    uArr[2] = ox; uArr[3] = (ch - boxH) / 2;
    uArr[4] = boxW; uArr[5] = boxH;
    uArr[6] = t; uArr[7] = gatherAt(p);
    uArr[8] = dt; uArr[9] = gpu.born; uArr[10] = samples.grid || 246; uArr[11] = 0;
    gpu.dev.queue.writeBuffer(gpu.uni, 0, uArr);
    gpu.born = 1;

    var enc = gpu.dev.createCommandEncoder();
    var cp = enc.beginComputePass();
    cp.setPipeline(gpu.cPipe); cp.setBindGroup(0, gpu.cBG);
    cp.dispatchWorkgroups(Math.ceil(gpu.n / 64)); cp.end();
    var rp = enc.beginRenderPass({ colorAttachments: [{
      view: gpu.gctx.getCurrentTexture().createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
    rp.setPipeline(gpu.rPipe); rp.setBindGroup(0, gpu.rBG);
    rp.setVertexBuffer(0, gpu.buf); rp.draw(6, gpu.n); rp.end();
    gpu.dev.queue.submit([enc.finish()]);
  }

  var copy = stage.querySelector('.portrait-copy');
  function copyState(p) {
    if (!copy) return;
    copy.classList.toggle('on', gatherAt(p) > 0.55);
  }

  function frame(now) {
    var t = now * 0.001;
    var dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;
    var p = progress();
    draw(p, t, dt); copyState(p);
    if (running) requestAnimationFrame(frame);
  }

  function start() {
    if (running || !gpu) return;
    running = true; last = 0; requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  function usePhoto() {
    root.classList.remove('portrait-gpu');
    stop();
    copyState(1);
  }

  function boot() {
    if (tried) { if (gpu) { root.classList.add('portrait-gpu'); if (onScreen) start(); } return; }
    tried = true;
    initGPU().then(function (g) {
      gpu = g;
      if (!gpu) { usePhoto(); return; }
      return loadSource().then(function (im) {
        if (!im || !im.naturalWidth) { usePhoto(); return; }
        srcImg = im;
        samples = samplePhoto(im);
        if (!samples) { usePhoto(); return; }
        root.classList.add('portrait-gpu');
        resize(); upload();
        if (onScreen) start(); else draw(progress(), 0, 0.016);
      });
    });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      if (onScreen) { boot(); start(); } else stop();
    }, { rootMargin: '200px' }).observe(stage);
  } else { boot(); }

  addEventListener('resize', function () {
    resize();
    if (gpu && samples && srcImg) { var s = samplePhoto(srcImg); if (s) { samples = s; upload(); } }
  });

  addEventListener('scroll', function () {
    if (!running) { copyState(progress()); }
  }, { passive: true });
})();
