(function () {
  'use strict';

  if (document.getElementById('srail')) return;

  var wrap = document.createElement('div');
  wrap.id = 'srail';
  wrap.setAttribute('aria-hidden', 'true');
  var cv = document.createElement('canvas');
  wrap.appendChild(cv);
  document.body.appendChild(wrap);

  var ctx = cv.getContext('2d');
  var W = 0, H = 0, dpr = 1;

    function volts(t) {
    var NOM = 3.3;
    if (t < 0.20) return NOM;
    if (t < 0.235) return NOM - 0.05;
    if (t < 0.40) {
      var k = (t - 0.235) / 0.055, i = Math.floor(k), f = k - i;
      if (i < 3) return NOM - 0.05 - Math.sin(f * Math.PI) * (0.42 + i * 0.12);
      return NOM - 0.24;
    }
    if (t < 0.46) return (NOM - 0.24) - ((t - 0.40) / 0.06) * 1.35;
    if (t < 0.76) {
      var c = (t - 0.46) / 0.10, n = Math.floor(c), p = c - n;
      if (p < 0.42) return 0.15 + (p / 0.42) * 2.80;
      if (p < 0.62) return 2.95 - ((p - 0.42) / 0.20) * 0.85;
      return Math.max(0.1, 2.10 - ((p - 0.62) / 0.38) * 2.0);
    }
    if (t < 0.80) return 0.12 + ((t - 0.76) / 0.04) * (NOM - 0.12);
    return NOM;
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = wrap.clientWidth; H = wrap.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function progress() {
    var doc = document.documentElement;
    var span = doc.scrollHeight - window.innerHeight;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(1, window.scrollY / span));
  }

    function x(v) { return 13 + (v / 4.0) * (W - 26); }
    function tOf(p) { return Math.min(0.985, p * 0.86); }

  function draw() {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    var p = progress();
    var N = 160, i, t, vy;

        ctx.beginPath();
    for (i = 0; i <= N; i++) {
      t = i / N; vy = 10 + t * (H - 20);
      i ? ctx.lineTo(x(volts(tOf(t))), vy) : ctx.moveTo(x(volts(tOf(t))), vy);
    }
    ctx.strokeStyle = 'rgba(152,160,172,.20)';
    ctx.lineWidth = 1; ctx.stroke();

        var M = Math.max(1, Math.floor(N * p));
    ctx.beginPath();
    for (i = 0; i <= M; i++) {
      t = i / N; vy = 10 + t * (H - 20);
      i ? ctx.lineTo(x(volts(tOf(t))), vy) : ctx.moveTo(x(volts(tOf(t))), vy);
    }
    ctx.strokeStyle = p > 0.78 ? 'rgba(127,176,148,.9)' : 'rgba(216,148,76,.85)';
    ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();

        var hv = volts(tOf(p)), hx = x(hv), hy = 10 + p * (H - 20);
    ctx.beginPath(); ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,11,16,.9)'; ctx.fill();
    ctx.beginPath(); ctx.arc(hx, hy, 3.1, 0, Math.PI * 2);
    ctx.fillStyle = hv < 2.43 ? '#e0654f' : (p > 0.78 ? '#7fb094' : '#d8944c');
    ctx.fill();
  }

  var kuyruk = false;
  function iste() {
    if (kuyruk) return;
    kuyruk = true;
    requestAnimationFrame(function () { kuyruk = false; draw(); });
  }

  function yeniden() { size(); draw(); }

  window.addEventListener('scroll', iste, { passive: true });
  window.addEventListener('resize', yeniden);
  yeniden();
})();
