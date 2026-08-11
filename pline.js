(function () {
  'use strict';

  var cv = document.getElementById('pline');
  if (!cv) return;

  var ctx = cv.getContext('2d');
  var veri = null, W = 0, H = 0, dpr = 1;
  var fare = { x: -9999, y: -9999, acik: false };
  var prog = 0, saglik = 1;

  fetch('portrait-lines.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { veri = d; boyut(); })
    .catch(function () {  });

  function boyut() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

    window.__portreDurum = function (p, s) { prog = p; saglik = s; };

  cv.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect();
    fare.x = e.clientX - r.left;
    fare.y = e.clientY - r.top;
    fare.acik = true;
  }, { passive: true });
  cv.addEventListener('pointerleave', function () { fare.acik = false; }, { passive: true });

  var t0 = performance.now();
  var gorunur = true;
  if ('IntersectionObserver' in window) {
    gorunur = false;
    new IntersectionObserver(function (g) {
      gorunur = g[0].isIntersecting;
    }, { rootMargin: '100px' }).observe(cv);
  }

  var azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ciz(t) {
    if (!veri || !W || !H) return;
    ctx.clearRect(0, 0, W, H);

    var sx = W / veri.w, sy = H / veri.h;
        var kriz = 1 - Math.max(0, Math.min(1, saglik));
    var salinim = azHareket ? 0.35 : 1;

    for (var i = 0; i < veri.teller.length; i++) {
      var tel = veri.teller[i];
      var bx = tel.x * sx;
      var o = tel.o;

      for (var j = 0; j < o.length; j++) {
        var y = o[j][0] * sy;
        var v = o[j][1] / 99;

                var n = o[j][0] / veri.h;
        var boz = Math.max(0, (n - 0.34) / 0.66);
        boz = boz * boz * 1.55;

        if (v < 0.05 + boz * 0.30) continue;
        if (((o[j][0] * 13 + tel.x * 5) % 29) < boz * 19) continue;

        var kay = Math.sin(o[j][0] * 0.09 + tel.x * 0.31) * boz * 13 * sx
                + Math.sin(o[j][0] * 0.031 + tel.x * 0.7) * boz * 6 * sx;

                if (kriz > 0.01) {
          kay += Math.sin(y * 0.06 + t * 6.0 + i * 0.4) * kriz * 9 * salinim;
        }

        var x = bx + kay;

                if (fare.acik) {
          var dx = x - fare.x, dy = y - fare.y;
          var r2 = dx * dx + dy * dy;
          var R = 120;
          if (r2 < R * R && r2 > 1) {
            var r = Math.sqrt(r2);
            var f = 1 - r / R;
            x += (dx / r) * f * f * 46;
            y += (dy / r) * f * f * 22;
          }
        }

        var kal = (2 + v * 5) * (1 - boz * 0.45) * Math.min(sx, sy) * 1.6;
        if (kal < 0.6) continue;

        var ton = v * (1 - boz * 0.42);
        var a = 1 - boz * 0.30;
        ctx.fillStyle = 'rgba(' +
          Math.round(40 + 176 * ton) + ',' +
          Math.round(50 + 98 * ton) + ',' +
          Math.round(62 + 14 * ton) + ',' + a.toFixed(2) + ')';
        ctx.fillRect(x - kal / 2, y, kal, Math.max(1, 2 * sy));
      }
    }
  }

  function dongu() {
    if (gorunur && !document.hidden) ciz((performance.now() - t0) / 1000);
    requestAnimationFrame(dongu);
  }
  requestAnimationFrame(dongu);
  window.addEventListener('resize', boyut);
  boyut();
})();
