/* Inline gaussian-splat figures. Each <figure class="splat"> assembles its own
   image out of points as it scrolls into view. One WebGPU device is shared by
   every figure on the page; the plain <img> stays as the fallback. */
(function () {
  'use strict';

  var figs = [].slice.call(document.querySelectorAll('.splat'));
  if (!figs.length) return;

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
    '  let scatter = vec2<f32>(h11(q.seed * 12.9) * u.res.x, h11(q.seed * 78.2 + 4.1) * u.res.y);',
    '  if (u.born < 0.5) { q.pos = scatter; }',
    '  let k = clamp(u.gather, 0.0, 1.0);',
    '  let drift = vec2<f32>(sin(u.time * 0.9 + q.seed * 31.0), cos(u.time * 0.75 + q.seed * 17.0)) * mix(22.0, 0.7, k);',
    '  let want = mix(scatter, home, k) + drift;',
    '  q.vel = mix(q.vel, (want - q.pos) * mix(1.6, 5.4, k), 0.17);',
    '  q.pos = q.pos + q.vel * u.dt;',
    '  qs[i] = q;',
    '}'
  ].join('\n');

  var WGSL_R = [
    'struct U { res: vec2<f32>, origin: vec2<f32>, size: vec2<f32>, time: f32, gather: f32, dt: f32, born: f32, grid: f32, p3: f32 };',
    '@group(0) @binding(0) var<uniform> u: U;',
    'fn h11(n: f32) -> f32 { return fract(sin(n * 78.233) * 43758.5453); }',
    'struct VO { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) col: vec3<f32>, @location(2) edge: f32 };',
    '@vertex',
    'fn vmain(@builtin(vertex_index) vi: u32, @location(0) ipos: vec2<f32>,',
    '         @location(1) icol: vec3<f32>, @location(2) iseed: f32) -> VO {',
    '  var quad = array<vec2<f32>, 6>(',
    '    vec2<f32>(-1.0,-1.0), vec2<f32>(1.0,-1.0), vec2<f32>(-1.0,1.0),',
    '    vec2<f32>(-1.0,1.0), vec2<f32>(1.0,-1.0), vec2<f32>(1.0,1.0));',
    '  let c = quad[vi];',
    '  let k = clamp(u.gather, 0.0, 1.0);',
    '  let cell = max(u.size.x / u.grid, 1.0);',
    '  let vary = 0.66 + h11(iseed * 5.31) * 0.95;',
    '  let sz = mix(2.2, cell * 1.7 * vary, k);',
    '  var o: VO;',
    '  let w = ipos + c * sz;',
    '  o.pos = vec4<f32>((w / u.res) * vec2<f32>(2.0, -2.0) + vec2<f32>(-1.0, 1.0), 0.0, 1.0);',
    '  o.uv = c; o.col = icol;',
    '  let box = (ipos - u.origin) / max(u.size, vec2<f32>(1.0, 1.0));',
    '  let rad = length((box - vec2<f32>(0.5, 0.5)) * vec2<f32>(1.16, 1.02)) * 2.0;',
    '  o.edge = 1.0 - smoothstep(0.94, 1.30, rad);',
    '  return o;',
    '}',
    '@fragment',
    'fn fmain(in: VO) -> @location(0) vec4<f32> {',
    '  let r2 = dot(in.uv, in.uv);',
    '  let k = clamp(u.gather, 0.0, 1.0);',
    '  let a = exp(-r2 * mix(5.5, 3.3, k));',
    '  let lum = dot(in.col, vec3<f32>(0.299, 0.587, 0.114));',
    '  let warm = vec3<f32>(0.88, 0.66, 0.42);',
    '  var col = mix(mix(vec3<f32>(lum), in.col, 0.5), in.col, k);',
    '  col = mix(col * warm * 1.4, col, mix(0.3, 0.95, k));',
    '  let fade = mix(0.45, 1.0, k) * mix(1.0, in.edge, k);',
    '  let alpha = a * fade * mix(0.5, 0.94, k);',
    '  return vec4<f32>(col * alpha, alpha);',
    '}'
  ].join('\n');

  var dev = null, cPipe = null, rPipe = null, cBGL = null, rBGL = null, fmt = null, lost = false;

  function initDevice() {
    if (!navigator.gpu) return Promise.resolve(false);
    return navigator.gpu.requestAdapter().then(function (ad) {
      if (!ad) return false;
      return ad.requestDevice().then(function (d) {
        dev = d;
        fmt = navigator.gpu.getPreferredCanvasFormat();
        d.lost.then(function () { lost = true; });
        d.addEventListener('uncapturederror', function () { lost = true; });
        var cMod = d.createShaderModule({ code: WGSL_C });
        var rMod = d.createShaderModule({ code: WGSL_R });
        cBGL = d.createBindGroupLayout({ entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }] });
        rBGL = d.createBindGroupLayout({ entries: [
          { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }] });
        cPipe = d.createComputePipeline({
          layout: d.createPipelineLayout({ bindGroupLayouts: [cBGL] }),
          compute: { module: cMod, entryPoint: 'cmain' } });
        rPipe = d.createRenderPipeline({
          layout: d.createPipelineLayout({ bindGroupLayouts: [rBGL] }),
          vertex: { module: rMod, entryPoint: 'vmain', buffers: [{
            arrayStride: 40, stepMode: 'instance', attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' },
              { shaderLocation: 1, offset: 24, format: 'float32x3' },
              { shaderLocation: 2, offset: 36, format: 'float32' }] }] },
          fragment: { module: rMod, entryPoint: 'fmain', targets: [{ format: fmt, blend: {
            color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }] },
          primitive: { topology: 'triangle-list' } });
        return true;
      });
    }).catch(function () { return false; });
  }

  function sample(image, gw) {
    var gh = Math.round(gw * (image.naturalHeight / image.naturalWidth));
    var oc = document.createElement('canvas');
    oc.width = gw; oc.height = gh;
    var c = oc.getContext('2d', { willReadFrequently: true });
    c.drawImage(image, 0, 0, gw, gh);
    var px;
    try { px = c.getImageData(0, 0, gw, gh).data; } catch (e) { return null; }
    /* the cutouts are transparent outside the subject: no point, no particle */
    var arr = new Float32Array(gw * gh * 10), i = 0;
    for (var y = 0; y < gh; y++) {
      for (var x = 0; x < gw; x++) {
        var s = (y * gw + x) * 4;
        if (px[s + 3] < 34) continue;
        var o = i * 10;
        arr[o] = Math.random(); arr[o + 1] = Math.random();
        arr[o + 4] = (x + 0.5) / gw; arr[o + 5] = (y + 0.5) / gh;
        arr[o + 6] = px[s] / 255; arr[o + 7] = px[s + 1] / 255; arr[o + 8] = px[s + 2] / 255;
        arr[o + 9] = Math.random();
        i++;
      }
    }
    if (!i) return null;
    return { data: arr.subarray(0, i * 10), count: i, grid: gw,
             aspect: image.naturalWidth / image.naturalHeight };
  }

  function Scene(fig) {
    this.fig = fig;
    this.cv = fig.querySelector('canvas');
    this.img = fig.querySelector('img');
    this.key = fig.getAttribute('data-key');
    this.buf = null; this.cBG = null; this.rBG = null; this.gctx = null;
    this.n = 0; this.born = 0; this.ready = false; this.visible = false;
    this.u = new Float32Array(16);
  }

  Scene.prototype.gather = function () {
    var r = this.fig.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    /* measured from the figure's centre: scattered while it is still low on the
       screen, fully gathered once it reaches the upper third */
    var mid = r.top + r.height / 2;
    var t = 1 - (mid - vh * 0.34) / (vh * 0.52);
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  };

  Scene.prototype.build = function () {
    if (this.ready || !dev || lost) return;
    var src = window['__SPLAT_' + String(this.key).toUpperCase()];
    var self = this;
    var im = new Image();
    im.onload = function () {
      var narrow = window.innerWidth < 700;
      var s = sample(im, narrow ? 150 : 230);
      if (!s) return;
      self.s = s;
      self.gctx = self.cv.getContext('webgpu');
      if (!self.gctx) return;
      self.gctx.configure({ device: dev, format: fmt, alphaMode: 'premultiplied' });
      self.buf = dev.createBuffer({ size: s.data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      dev.queue.writeBuffer(self.buf, 0, s.data);
      self.uni = dev.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      self.cBG = dev.createBindGroup({ layout: cBGL, entries: [
        { binding: 0, resource: { buffer: self.buf } }, { binding: 1, resource: { buffer: self.uni } }] });
      self.rBG = dev.createBindGroup({ layout: rBGL, entries: [{ binding: 0, resource: { buffer: self.uni } }] });
      self.n = s.count; self.born = 0; self.ready = true;
      self.fig.classList.add('on');
      self.resize();
    };
    im.onerror = function () {};
    im.src = src || self.img.currentSrc || self.img.src;
  };

  Scene.prototype.resize = function () {
    if (!this.ready || lost) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(this.cv.clientWidth * dpr), h = Math.round(this.cv.clientHeight * dpr);
    if (!w || !h) return;
    var max = dev.limits.maxTextureDimension2D || 4096;
    this.cv.width = Math.min(w, max); this.cv.height = Math.min(h, max);
  };

  Scene.prototype.draw = function (t, dt) {
    if (!this.ready || lost || !this.cv.width) return;
    var cw = this.cv.width, ch = this.cv.height;
    var boxH = ch * 0.96, boxW = boxH * this.s.aspect;
    if (boxW > cw * 0.96) { boxW = cw * 0.96; boxH = boxW / this.s.aspect; }
    var u = this.u;
    u[0] = cw; u[1] = ch;
    u[2] = (cw - boxW) / 2; u[3] = (ch - boxH) / 2;
    u[4] = boxW; u[5] = boxH;
    u[6] = t; u[7] = this.gather();
    u[8] = dt; u[9] = this.born; u[10] = this.s.grid; u[11] = 0;
    dev.queue.writeBuffer(this.uni, 0, u);
    this.born = 1;

    var enc = dev.createCommandEncoder();
    var cp = enc.beginComputePass();
    cp.setPipeline(cPipe); cp.setBindGroup(0, this.cBG);
    cp.dispatchWorkgroups(Math.ceil(this.n / 64)); cp.end();
    var rp = enc.beginRenderPass({ colorAttachments: [{
      view: this.gctx.getCurrentTexture().createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
    rp.setPipeline(rPipe); rp.setBindGroup(0, this.rBG);
    rp.setVertexBuffer(0, this.buf); rp.draw(6, this.n); rp.end();
    dev.queue.submit([enc.finish()]);
  };

  var scenes = figs.map(function (f) { return new Scene(f); });
  var running = false, last = 0;

  function frame(now) {
    var t = now * 0.001, dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;
    var any = false;
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].visible) { scenes[i].draw(t, dt); any = true; }
    }
    if (any && !lost) requestAnimationFrame(frame); else running = false;
  }
  function kick() {
    if (running || lost) return;
    running = true; last = 0; requestAnimationFrame(frame);
  }

  initDevice().then(function (ok) {
    if (!ok) return;
    document.documentElement.classList.add('splat-gpu');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var sc = scenes.filter(function (s) { return s.fig === e.target; })[0];
          if (!sc) return;
          sc.visible = e.isIntersecting;
          if (e.isIntersecting) { sc.build(); kick(); }
        });
      }, { rootMargin: '300px 0px' });
      scenes.forEach(function (s) { io.observe(s.fig); });
    } else {
      scenes.forEach(function (s) { s.visible = true; s.build(); });
      kick();
    }
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', function () { scenes.forEach(function (s) { s.resize(); }); kick(); });
  });
})();
