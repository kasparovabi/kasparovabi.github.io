(function () {
  'use strict';

  var host = document.getElementById('timeline');
  if (!host) return;

  var cv = document.createElement('canvas');
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label',
    'Career timeline from 2016 to 2026. Visual production work through 2023, ' +
    'overlapping with generative AI from 2023, fully software and automation ' +
    'from 2025. The same roles are listed below with dates.');
  host.appendChild(cv);

  var DIM = '#98a0ac', FAINT = '#69727f', COPPER = '#d8944c', PATINA = '#7fb094';
  var BASLA = 2016, BITIS = 2026.7;

    var IZLER = [
    {
      ad: 'VISUAL PRODUCTION',
      renk: COPPER,
      araliklar: [
        { a: 2016.7, b: 2018.0, ad: 'Teaching, editing' },
        { a: 2018.0, b: 2022.9, ad: 'Photography, design' },
        { a: 2022.8, b: 2025.6, ad: 'Generative AI art' }
      ]
    },
    {
      ad: 'SOFTWARE, AUTOMATION',
      renk: PATINA,
      araliklar: [
        { a: 2023.0, b: 2025.6, ad: 'Pipeline automation' },
        { a: 2025.8, b: 2026.7, ad: 'Agent systems' }
      ]
    }
  ];

  var ISARETLER = [
    { yil: 2023.0, ad: 'Stable Diffusion, ComfyUI on own machines' },
    { yil: 2025.85, ad: 'Claude Code as primary tool' },
    { yil: 2026.2, ad: 'First production agent systems' }
  ];

  var W = 0, H = 0, ctx = cv.getContext('2d'), fare = -1;

  function boyut() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = host.clientWidth; H = host.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function x(yil) {
    return 12 + ((yil - BASLA) / (BITIS - BASLA)) * (W - 24);
  }

  function kutu(bx, by, bw, bh, r) {
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
    ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
    ctx.arcTo(bx, by + bh, bx, by, r);
    ctx.arcTo(bx, by, bx + bw, by, r);
    ctx.closePath();
  }

  function ciz(t) {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    ctx.font = '9px "Martian Mono", ui-monospace, monospace';

    for (var y = 2017; y <= 2026; y++) {
      var gx = x(y);
      ctx.strokeStyle = 'rgba(152,160,172,.10)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, 20); ctx.lineTo(gx, H - 22); ctx.stroke();
      if (y % 2 === 0) {
        ctx.fillStyle = FAINT;
        ctx.fillText(String(y), gx - 12, H - 8);
      }
    }

    var izH = 20, bosluk = 14, ust = 30;
    for (var i = 0; i < IZLER.length; i++) {
      var iz = IZLER[i];
      var yy = ust + i * (izH + bosluk);
      ctx.fillStyle = iz.renk;
      ctx.fillText(iz.ad, 12, yy - 6);

      for (var j = 0; j < iz.araliklar.length; j++) {
        var r = iz.araliklar[j];
        var bx = x(r.a), bw = Math.max(6, x(r.b) - x(r.a));
        var vurgu = (fare >= r.a && fare <= r.b);
        kutu(bx, yy, bw, izH, 2);
        ctx.fillStyle = vurgu
          ? (i === 0 ? 'rgba(216,148,76,.30)' : 'rgba(127,176,148,.30)')
          : (i === 0 ? 'rgba(216,148,76,.13)' : 'rgba(127,176,148,.13)');
        ctx.fill();
        ctx.strokeStyle = vurgu ? iz.renk : 'rgba(152,160,172,.20)';
        ctx.lineWidth = 1; ctx.stroke();
                var tw = ctx.measureText(r.ad).width;
        if (bw > tw + 16) {
          ctx.fillStyle = vurgu ? '#ece9e2' : FAINT;
          ctx.fillText(r.ad, bx + 7, yy + 13);
        }
      }
    }

        var ox = x(2023.0), oy = ust - 2, oh = (izH + bosluk) + izH + 4;
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(236,233,226,.28)';
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + oh); ctx.stroke();
    ctx.setLineDash([]);

    for (var m = 0; m < ISARETLER.length; m++) {
      var s = ISARETLER[m];
      var sx = x(s.yil);
      var yakin = Math.abs(fare - s.yil) < 0.45;
      ctx.beginPath(); ctx.arc(sx, H - 26, yakin ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fillStyle = yakin ? '#ece9e2' : DIM; ctx.fill();
      if (yakin) {
        var tw = ctx.measureText(s.ad).width;
        var lx = Math.min(W - tw - 14, Math.max(8, sx - tw / 2));
        kutu(lx - 5, H - 48, tw + 10, 15, 2);
        ctx.fillStyle = '#080b10'; ctx.fill();
        ctx.strokeStyle = 'rgba(152,160,172,.35)'; ctx.stroke();
        ctx.fillStyle = '#ece9e2';
        ctx.fillText(s.ad, lx, H - 37);
      }
    }
  }

  host.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    var px = e.clientX - r.left;
    fare = BASLA + ((px - 12) / (W - 24)) * (BITIS - BASLA);
  }, { passive: true });
  host.addEventListener('pointerleave', function () { fare = -1; }, { passive: true });

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
