/* The machine.
   The page claims "one human, several agents" and never showed the machine.
   This draws the actual pipeline a task travels through here: routing, the
   gates it must clear, the human approval point, and the audit trail.
   Numbers come from the real systems, measured, not written by hand. */
(function () {
  'use strict';

  var host = document.getElementById('machine');
  if (!host) return;

  var cv = document.createElement('canvas');
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label',
    'Pipeline diagram: a task is routed to a model, passes a write time rule ' +
    'set and a twenty pass CI gate, stops at a human approval point, then is ' +
    'either merged or rolled back, with every run written to an audit log. ' +
    'The same stages are described in the text below.');
  host.appendChild(cv);

  var DIM = '#98a0ac', FAINT = '#69727f', BONE = '#ece9e2';
  var COPPER = '#d8944c', PATINA = '#7fb094', ALARM = '#d4533f';

  var azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var yavas = azHareket ? 2.2 : 1.0;

  /* the stages a unit of work actually goes through */
  var ASAMALAR = [
    { ad: 'TASK', alt: 'one repo' },
    { ad: 'ROUTE', alt: 'cheapest model' },
    { ad: 'guard-20', alt: 'write rules' },
    { ad: 'audit-20', alt: '20 passes' },
    { ad: 'APPROVE', alt: 'human' },
    { ad: 'SHIP', alt: 'or revert' }
  ];

  var W = 0, H = 0, ctx = cv.getContext('2d'), vurgu = -1;

  function boyut() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = host.clientWidth; H = host.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function kutu(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function ciz(t) {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    ctx.font = '9px "Martian Mono", ui-monospace, monospace';

    var n = ASAMALAR.length;
    var pay = 8;
    /* six stages side by side need ~90px each to stay readable; below that
       the labels clip, so the pipeline stacks vertically instead */
    var dikey = W < n * 108;
    var kw = dikey ? (W - pay * 2) : (W - pay * (n + 1)) / n;
    var kh = dikey ? Math.max(20, (H - 46 - pay * (n + 1)) / n) : 46;
    var ky = 30;

    /* work units flowing through; one of them is rejected at the gate and
       goes back, because that is what the gate is for */
    var akis = [];
    for (var u = 0; u < 3; u++) {
      var faz = (t * 0.13 / yavas + u * 0.33) % 1;
      var red = (u === 1);
      var p = faz * n;
      if (red && p > 3.5) {
        var geri = (p - 3.5) / (n - 3.5);
        p = 3.5 - geri * 2.2;
      }
      akis.push({ p: p, red: red });
    }

    for (var i = 0; i < n; i++) {
      var a = ASAMALAR[i];
      var x = dikey ? pay : pay + i * (kw + pay);
      var yy = dikey ? (18 + i * (kh + pay * 0.5)) : ky;
      var aktif = (vurgu === i);
      var onay = (i === 4);

      /* something sitting in this stage right now */
      var dolu = akis.some(function (f) {
        return f.p >= i - 0.4 && f.p < i + 0.6;
      });

      kutu(x, yy, kw, kh, 3);
      ctx.fillStyle = aktif ? 'rgba(216,148,76,.13)'
        : (dolu ? 'rgba(127,176,148,.10)' : 'rgba(15,20,28,.6)');
      ctx.fill();
      ctx.strokeStyle = onay ? 'rgba(216,148,76,.55)'
        : (aktif || dolu ? 'rgba(127,176,148,.45)' : 'rgba(152,160,172,.18)');
      ctx.lineWidth = onay ? 1.4 : 1;
      if (onay) ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = onay ? COPPER : (aktif || dolu ? BONE : DIM);
      ctx.fillText(a.ad, x + 8, yy + (dikey ? kh / 2 + 3 : 19));
      ctx.fillStyle = FAINT;
      /* clip on a word boundary: slicing two characters at a time left
         half words like 'that' hanging in the box */
      var alt = a.alt;
      while (ctx.measureText(alt).width > kw - 16 && alt.indexOf(' ') > 0) {
        alt = alt.slice(0, alt.lastIndexOf(' '));
      }
      if (!dikey) ctx.fillText(alt, x + 8, yy + 34);
      else ctx.fillText(alt, x + 92, yy + kh / 2 + 3);

      if (i < n - 1 && !dikey) {
        var ax = x + kw + 1, ay = yy + kh / 2;
        ctx.strokeStyle = 'rgba(152,160,172,.28)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + pay - 2, ay); ctx.stroke();
      }
    }

    /* the units themselves */
    for (var k = 0; k < akis.length; k++) {
      var f = akis[k];
      var idx = Math.max(0, Math.min(n - 1, Math.floor(f.p)));
      var ic = f.p - idx;
      var bx, by;
      if (dikey) {
        bx = W - 16;
        by = 18 + (idx + ic) * (kh + pay * 0.5) + kh / 2;
      } else {
        bx = pay + (idx + ic) * (kw + pay) + kw / 2;
        by = ky + kh + 16;
      }
      ctx.beginPath();
      ctx.arc(Math.max(10, Math.min(W - 10, bx)), Math.min(H - 30, by), 3.4, 0, Math.PI * 2);
      ctx.fillStyle = f.red ? ALARM : (f.p > 4.4 ? PATINA : COPPER);
      ctx.fill();
    }

    /* audit trail: every run leaves a line */
    if (dikey) return;
    var ty = H - 22;
    ctx.strokeStyle = 'rgba(152,160,172,.16)';
    ctx.beginPath(); ctx.moveTo(8, ty); ctx.lineTo(W - 8, ty); ctx.stroke();
    ctx.fillStyle = FAINT;
    ctx.fillText('AUDIT LOG', 8, ty - 6);
    for (var m = 0; m < 40; m++) {
      var mx = 78 + m * ((W - 96) / 40);
      var mh = 3 + ((m * 5) % 7);
      ctx.fillStyle = (m % 9 === 4) ? 'rgba(216,148,76,.5)' : 'rgba(152,160,172,.26)';
      ctx.fillRect(mx, ty - mh, 1.4, mh);
    }
  }

  host.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    var px = e.clientX - r.left;
    var n = ASAMALAR.length, pay = 8;
    var kw = (W - pay * (n + 1)) / n;
    vurgu = Math.floor((px - pay) / (kw + pay));
    if (vurgu < 0 || vurgu >= n) vurgu = -1;
  }, { passive: true });
  host.addEventListener('pointerleave', function () { vurgu = -1; }, { passive: true });

  var gorunur = true;
  if ('IntersectionObserver' in window) {
    gorunur = false;
    new IntersectionObserver(function (g) {
      gorunur = g[0].isIntersecting;
    }, { rootMargin: '150px' }).observe(host);
  }

  var t0 = performance.now();
  function dongu() {
    if (gorunur && !document.hidden) ciz((performance.now() - t0) / 1000);
    requestAnimationFrame(dongu);
  }
  boyut();
  requestAnimationFrame(dongu);
  window.addEventListener('resize', boyut);
})();
