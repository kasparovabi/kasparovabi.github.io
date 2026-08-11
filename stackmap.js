(function () {
  'use strict';

  var host = document.getElementById('stack-map');
  if (!host) return;

  var cv = document.createElement('canvas');
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label',
    'Stack drawn as layers: device, runtime, service, interface, delivery. ' +
    'The same list is written out below this diagram.');
  host.appendChild(cv);

  var DIM = '#98a0ac', FAINT = '#69727f', COPPER = '#d8944c', PATINA = '#7fb094';

    var KATMANLAR = [
    { ad: 'DEVICE', araclar: ['ESP-IDF', 'PlatformIO', 'Arduino', 'servo', 'audio'] },
    { ad: 'RUNTIME', araclar: ['Python', 'TypeScript', 'Swift', 'C++', 'Go', 'SQL'] },
    { ad: 'SERVICE', araclar: ['FastAPI', 'NestJS', 'PostgreSQL', 'Redis', 'Supabase', 'Prisma'] },
    { ad: 'INTERFACE', araclar: ['Next.js', 'React', 'SwiftUI', 'Tauri', 'Expo', 'PySide6'] },
    { ad: 'DELIVERY', araclar: ['Docker', 'AWS EC2', 'Cloudflare', 'Tailscale', 'launchd', 'CI'] }
  ];

  var W = 0, H = 0, dpr = 1, ctx = cv.getContext('2d');
  var vurgu = -1;

  function boyut() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    var n = KATMANLAR.length;
    var pay = 8;
    var kh = (H - pay * (n + 1)) / n;
    var solW = Math.min(150, W * 0.26);

    for (var i = 0; i < n; i++) {
            var k = KATMANLAR[n - 1 - i];
      var y = pay + i * (kh + pay);
      var aktif = (vurgu === n - 1 - i);

      kutu(2, y, W - 4, kh, 3);
      ctx.fillStyle = aktif ? 'rgba(216,148,76,.10)' : 'rgba(15,20,28,.55)';
      ctx.fill();
      ctx.strokeStyle = aktif ? 'rgba(216,148,76,.55)' : 'rgba(152,160,172,.16)';
      ctx.lineWidth = 1; ctx.stroke();

      ctx.font = '10px "Martian Mono", ui-monospace, monospace';
      ctx.fillStyle = aktif ? COPPER : DIM;
      ctx.fillText(k.ad, 12, y + kh / 2 + 3);

            ctx.font = '11px "Martian Mono", ui-monospace, monospace';
      var cx = solW, cy = y + kh / 2;
      for (var j = 0; j < k.araclar.length; j++) {
        var s = k.araclar[j];
        var tw = ctx.measureText(s).width + 14;
        if (cx + tw > W - 8) break;
        kutu(cx, cy - 9, tw, 18, 2);
        ctx.fillStyle = 'rgba(8,11,16,.72)'; ctx.fill();
        ctx.strokeStyle = aktif ? 'rgba(216,148,76,.35)' : 'rgba(152,160,172,.18)';
        ctx.stroke();
        ctx.fillStyle = aktif ? '#ece9e2' : FAINT;
        ctx.fillText(s, cx + 7, cy + 4);
        cx += tw + 6;
      }
    }

        var faz = (t * 0.11) % 1;
    var yy = H - pay - faz * (H - pay * 2);
    ctx.strokeStyle = 'rgba(127,176,148,.30)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(solW - 12, yy); ctx.lineTo(W - 8, yy); ctx.stroke();
    ctx.beginPath(); ctx.arc(solW - 12, yy, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = PATINA; ctx.fill();
  }

  host.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    var y = e.clientY - r.top;
    var n = KATMANLAR.length, pay = 8;
    var kh = (H - pay * (n + 1)) / n;
    var idx = Math.floor((y - pay) / (kh + pay));
    vurgu = (idx >= 0 && idx < n) ? (n - 1 - idx) : -1;
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
  window.addEventListener('resize', function () { boyut(); });
})();
