(function () {
  'use strict';

  var INK = '#080b10', BONE = '#ece9e2', DIM = '#98a0ac', FAINT = '#69727f';
  var COPPER = '#d8944c', PATINA = '#7fb094', CLAY = '#c07a63', ALARM = '#d4533f';

  var azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var yavas = azHareket ? 2.2 : 1.0;

  function yuvarlak(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function etiket(c, s, x, y, renk) {
    c.font = '9px "Martian Mono", ui-monospace, monospace';
    c.fillStyle = renk;
    c.fillText(s, x, y);
  }

    function sahneGorev(c, W, H, t) {
    var kolon = ['INBOX', 'ASSIGNED', 'DONE'];
    var kw = W / 3;
    for (var i = 0; i < 3; i++) {
      c.strokeStyle = 'rgba(152,160,172,.16)';
      c.lineWidth = 1;
      c.strokeRect(i * kw + 6, 22, kw - 12, H - 30);
      etiket(c, kolon[i], i * kw + 12, 16, FAINT);
    }
    for (var k = 0; k < 3; k++) {
      var faz = (t * 0.22 / yavas + k * 0.34) % 1;
      var duraklar = [0.5 * kw, 1.5 * kw, 2.5 * kw];
      var seg = Math.min(2, Math.floor(faz * 3));
      var ic = (faz * 3) - seg;
      var yumusak = ic * ic * (3 - 2 * ic);
      var x = duraklar[seg] + (duraklar[Math.min(2, seg + 1)] - duraklar[seg]) * yumusak;
      var y = 40 + k * 20;
      var renk = seg === 2 ? PATINA : (seg === 1 ? COPPER : DIM);
      yuvarlak(c, x - 26, y - 8, 52, 17, 3);
      c.fillStyle = 'rgba(8,11,16,.9)'; c.fill();
      c.strokeStyle = renk; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = renk;
      c.fillRect(x - 21, y - 3, 30 - k * 6, 2);
      c.fillRect(x - 21, y + 2, 20 - k * 3, 2);
    }
  }

    function sahneFabrika(c, W, H, t) {
    var gx = W * 0.58, yo = H * 0.55;
    c.strokeStyle = 'rgba(152,160,172,.2)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(8, yo); c.lineTo(W - 8, yo); c.stroke();
    c.setLineDash([3, 4]);
    c.strokeStyle = 'rgba(216,148,76,.6)';
    c.beginPath(); c.moveTo(gx, 14); c.lineTo(gx, H - 12); c.stroke();
    c.setLineDash([]);
    etiket(c, 'GATE', gx - 14, 10, COPPER);

    for (var k = 0; k < 4; k++) {
      var faz = (t * 0.19 / yavas + k * 0.25) % 1;
      var red = (k === 2);
      var x = 10 + faz * (W - 20);
      var y = yo;
      if (red && x > gx) {
        var geri = (x - gx) / (W - gx);
        x = gx - geri * (gx - 14);
        y = yo - 22 * Math.sin(geri * Math.PI);
      }
      var renk = red ? ALARM : (x > gx ? PATINA : DIM);
      yuvarlak(c, x - 9, y - 9, 18, 18, 2);
      c.fillStyle = 'rgba(8,11,16,.92)'; c.fill();
      c.strokeStyle = renk; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = renk;
      c.fillRect(x - 5, y - 4, 10, 2);
      c.fillRect(x - 5, y + 1, 6, 2);
    }
  }

    function sahneSes(c, W, H, t) {
    var orta = H * 0.52;
    var dongu = (t * 0.30 / yavas) % 1;
    var sessiz = dongu > 0.42;

    c.beginPath();
    for (var x = 8; x < W - 8; x += 2) {
      var n = (x - 8) / (W - 16);
      var genlik = sessiz ? 0.6 : (10 + 9 * Math.sin(n * 22 + t * 5));
      var y = orta + Math.sin(x * 0.55 + t * 7) * genlik * (sessiz ? 1 : (0.35 + 0.65 * Math.sin(n * Math.PI)));
      x === 8 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.strokeStyle = sessiz ? 'rgba(152,160,172,.45)' : COPPER;
    c.lineWidth = 1.4; c.stroke();
    etiket(c, sessiz ? 'SILENCE' : 'SPEECH', 10, 14, sessiz ? FAINT : COPPER);

    if (sessiz) {
      var g = Math.min(1, (dongu - 0.42) / 0.34);
      c.globalAlpha = g;
      var kutuW = 108;
      yuvarlak(c, W - kutuW - 10, orta + 14, kutuW, 20, 3);
      c.fillStyle = 'rgba(212,83,63,.14)'; c.fill();
      c.strokeStyle = ALARM; c.lineWidth = 1; c.stroke();
      c.font = '9px "Martian Mono", ui-monospace, monospace';
      c.fillStyle = ALARM;
      c.fillText('"thank you" (invented)', W - kutuW - 3, orta + 27);
      c.globalAlpha = 1;
    }
  }

    function sahneKapi(c, W, H, t) {
    var dongu = (t * 0.14 / yavas) % 1;
    var sut = 10, satir = 2, gw = (W - 20) / sut, gh = 15;
    var acik = Math.floor(dongu * 26);

    for (var i = 0; i < 20; i++) {
      var r = Math.floor(i / sut), s = i % sut;
      var x = 10 + s * gw, y = 26 + r * (gh + 6);
      var son = (i === 19);
      var yanik = i < acik;
      yuvarlak(c, x, y, gw - 4, gh, 2);
      if (yanik) {
        c.fillStyle = son ? 'rgba(212,83,63,.22)' : 'rgba(127,176,148,.18)';
        c.fill();
      }
      c.strokeStyle = yanik ? (son ? ALARM : PATINA) : 'rgba(152,160,172,.2)';
      c.lineWidth = 1; c.stroke();
    }

    if (acik >= 20) {
      var g = Math.min(1, (acik - 20) / 5);
      c.globalAlpha = g;
      etiket(c, 'pass 20 falsifies the other nineteen', 10, H - 6, ALARM);
      c.globalAlpha = 1;
    } else {
      etiket(c, acik + ' / 20 passes', 10, H - 6, FAINT);
    }
    etiket(c, 'CI GATE', 10, 16, DIM);
  }

    function sahneTelefon(c, W, H, t) {
    var px = 26, mx = W - 34, y = H * 0.5;
    c.strokeStyle = 'rgba(152,160,172,.22)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(px + 14, y); c.lineTo(mx - 16, y); c.stroke();

    yuvarlak(c, px - 9, y - 16, 18, 32, 3);
    c.strokeStyle = DIM; c.lineWidth = 1.2; c.stroke();
    etiket(c, 'PHONE', px - 18, y + 28, FAINT);

    yuvarlak(c, mx - 16, y - 12, 32, 24, 2);
    c.strokeStyle = DIM; c.lineWidth = 1.2; c.stroke();
    etiket(c, 'MAC', mx - 8, y + 28, FAINT);

    var dongu = (t * 0.26 / yavas) % 1;
    var gidis = dongu < 0.5;
    var f = gidis ? dongu / 0.5 : (dongu - 0.5) / 0.5;
    var yum = f * f * (3 - 2 * f);
    var x = gidis ? (px + 14) + yum * (mx - 16 - px - 14)
                  : (mx - 16) - yum * (mx - 16 - px - 14);
    c.beginPath(); c.arc(x, y, 3.6, 0, Math.PI * 2);
    c.fillStyle = gidis ? COPPER : PATINA; c.fill();
    etiket(c, gidis ? 'command' : 'screenshot', x - 22, y - 12,
           gidis ? COPPER : PATINA);
  }

    function sahneAcik(c, W, H, t) {
    var y = H * 0.56;
    c.strokeStyle = 'rgba(152,160,172,.22)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(10, y); c.lineTo(W - 10, y); c.stroke();

    var dongu = (t * 0.10 / yavas) % 1;
    var gun = Math.floor(dongu * 118);

    for (var i = 0; i < 46; i++) {
      var n = i / 45;
      if (n * 118 > gun) break;
      var x = 12 + n * (W - 24);
      var h = 3 + ((i * 7) % 9);
      c.fillStyle = 'rgba(152,160,172,.34)';
      c.fillRect(x, y - h, 1.5, h);
    }

    c.fillStyle = ALARM;
    c.beginPath(); c.arc(12, y, 3.4, 0, Math.PI * 2); c.fill();
    etiket(c, 'report', 6, y + 14, ALARM);

    if (gun >= 103) {
      var fx = 12 + (103 / 118) * (W - 24);
      c.fillStyle = PATINA;
      c.beginPath(); c.arc(fx, y, 4.2, 0, Math.PI * 2); c.fill();
      c.fillRect(fx - 0.8, y - 16, 1.6, 16);
      etiket(c, 'fix', fx - 8, y + 14, PATINA);
    }
    etiket(c, 'day ' + gun + ' / ' + Math.min(gun, 103) + ' silent', 10, 14,
           gun >= 103 ? PATINA : FAINT);
  }

  var SAHNELER = {
    'Maarif Task Management': sahneGorev,
    'Etsy Factory and Demand Engine': sahneFabrika,
    'Rıfkı · the speech side': sahneSes,
    'guard-20, audit-20 and Mythos Scaffold': sahneKapi,
    'Cebimde Claude': sahneTelefon,
    'Coordinated security disclosure': sahneAcik
  };

  var canli = [];

  function kur(kart, ciz) {
    var kutu = document.createElement('div');
    kutu.className = 'kart-sahne';
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    kutu.appendChild(cv);
    var h3 = kart.querySelector('h3');
    var sonra = h3 ? h3.nextElementSibling : null;
    kart.insertBefore(kutu, sonra || kart.firstChild);

    var c = cv.getContext('2d');
    var kayit = { cv: cv, c: c, ciz: ciz, gorunur: false, W: 0, H: 0 };

    function boyut() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      kayit.W = kutu.clientWidth; kayit.H = kutu.clientHeight;
      if (!kayit.W || !kayit.H) return;
      cv.width = Math.round(kayit.W * dpr);
      cv.height = Math.round(kayit.H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    kayit.boyut = boyut;
    boyut();
    canli.push(kayit);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (gs) {
        kayit.gorunur = gs[0].isIntersecting;
      }, { rootMargin: '120px' }).observe(kutu);
    } else {
      kayit.gorunur = true;
    }
  }

  [].slice.call(document.querySelectorAll('article.card')).forEach(function (kart) {
    var h3 = kart.querySelector('h3');
    if (!h3) return;
    var ciz = SAHNELER[h3.textContent.trim()];
    if (ciz) kur(kart, ciz);
  });

  var t0 = performance.now();
  function dongu() {
    var t = (performance.now() - t0) / 1000;
    for (var i = 0; i < canli.length; i++) {
      var k = canli[i];
      if (!k.gorunur || !k.W || document.hidden) continue;
      k.c.clearRect(0, 0, k.W, k.H);
      k.ciz(k.c, k.W, k.H, t);
    }
    requestAnimationFrame(dongu);
  }
  requestAnimationFrame(dongu);

  window.addEventListener('resize', function () {
    for (var i = 0; i < canli.length; i++) canli[i].boyut();
  });
})();
