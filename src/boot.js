/*
 * FishWise SG — boot scene + shared fish renderer.
 *
 * Classic (non-module) script so it runs before the app modules load and the
 * intro paints on the first frames. It draws:
 *   - a word field (spot names, fish names, "FishWise SG") that lights up
 *     around the cursor,
 *   - a night jetty with anglers, lamps and fishing lines above the waterline,
 *   - schools of fish with real body plans (barramundi, peacock bass,
 *     snakehead, tilapia, mangrove jack, javelin grunter, catfish, baitfish).
 *
 * window.FWFish is reused by the app (dashboard hero) to draw the same fish.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Fish renderer
     u runs from the snout (0) to the tail base (1). Units are body lengths.
     ------------------------------------------------------------------ */

  var KINDS = {
    barra:   { d: .27, hump: .36, ped: .30, snout: .16, concave: .035, tail: 'round', tailL: .19, eye: .1,
               dors: [[.30, .55, .19, 1], [.58, .75, .15, 0]], anal: [.62, .75, .12], pelv: .36,
               c: [[34, 52, 78], [104, 132, 164], [206, 216, 228]] },
    peacock: { d: .31, hump: .40, ped: .33, snout: .2, concave: .015, tail: 'round', tailL: .19, eye: .11,
               dors: [[.27, .52, .16, 1], [.54, .77, .2, 0]], anal: [.6, .77, .15], pelv: .34, bars: 3, ocellus: true,
               c: [[40, 58, 58], [118, 140, 112], [214, 214, 178]] },
    snake:   { d: .17, hump: .26, ped: .62, snout: .38, concave: 0, tail: 'round', tailL: .14, eye: .07,
               dors: [[.24, .84, .085, 0]], anal: [.5, .84, .075], pelv: .3, blotch: true,
               c: [[28, 38, 50], [80, 98, 116], [168, 178, 188]] },
    tilapia: { d: .40, hump: .42, ped: .32, snout: .22, concave: .015, tail: 'square', tailL: .17, eye: .12,
               dors: [[.24, .62, .15, 1], [.62, .8, .19, 0]], anal: [.6, .79, .16], pelv: .34, bars: 6,
               c: [[44, 58, 74], [116, 132, 148], [196, 204, 212]] },
    jack:    { d: .32, hump: .40, ped: .27, snout: .18, concave: .025, tail: 'fork', tailL: .22, eye: .11,
               dors: [[.30, .52, .18, 1], [.54, .72, .15, 0]], anal: [.6, .72, .12], pelv: .35,
               c: [[66, 54, 64], [142, 120, 124], [218, 204, 200]] },
    grunter: { d: .28, hump: .38, ped: .28, snout: .2, concave: .03, tail: 'fork', tailL: .22, eye: .11,
               dors: [[.30, .50, .18, 1], [.52, .72, .12, 0]], anal: [.6, .72, .1], pelv: .35, spots: true,
               c: [[56, 70, 86], [138, 152, 168], [216, 222, 230]] },
    catfish: { d: .20, hump: .30, ped: .26, snout: .3, concave: 0, tail: 'fork', tailL: .21, eye: .09,
               dors: [[.27, .39, .2, 1]], adipose: true, anal: [.58, .78, .08], pelv: .45, barbels: true,
               c: [[40, 48, 60], [106, 116, 130], [188, 194, 204]] },
    bait:    { d: .2, hump: .38, ped: .24, snout: .12, concave: 0, tail: 'fork', tailL: .24, eye: .1,
               dors: [[.42, .56, .12, 0]], anal: [.66, .76, .08], pelv: .45, simple: true,
               c: [[58, 92, 134], [150, 182, 214], [226, 236, 246]] },
  };

  function prof(k, u) {
    var H = k.d / 2;
    if (u < k.hump) return H * (k.snout + (1 - k.snout) * Math.sin((u / k.hump) * Math.PI / 2));
    var s = (u - k.hump) / (1 - k.hump);
    return H * (1 - (1 - k.ped) * Math.pow(s, 1.12));
  }

  function mix(a, b, f) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' + Math.round(a[1] + (b[1] - a[1]) * f) + ',' + Math.round(a[2] + (b[2] - a[2]) * f) + ')';
  }

  /**
   * Draw one fish at (x, y), length L px, facing dir (+1 right / -1 left),
   * tilt radians, beat phase, fog 0..1 (blends into the water colour).
   */
  function drawFish(ctx, kind, x, y, L, dir, tilt, phase, fog, water) {
    var k = KINDS[kind] || KINDS.barra;
    water = water || [6, 20, 44];
    fog = Math.max(0, Math.min(1, fog || 0));
    var top = mix(k.c[0], water, fog * .85), mid = mix(k.c[1], water, fog * .8), bel = mix(k.c[2], water, fog * .75);
    var finC = mix([k.c[0][0] * .8, k.c[0][1] * .8, k.c[0][2] * .8], water, fog * .8);
    var bodyL = 1 - k.tailL;
    var N = k.simple ? 10 : 22;
    var amp = .018;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(dir * L, L);

    function flex(u) { return amp * Math.sin(phase - u * 3.2) * u * u; }
    function X(u) { return .5 - u * bodyL; }
    function topY(u) { return -prof(k, u) - .012 + flex(u) + k.concave * Math.exp(-Math.pow((u - .13) / .06, 2)); }
    function botY(u) { return prof(k, u) * .93 - .012 + flex(u); }

    // Fins first (the body covers their roots)
    ctx.fillStyle = finC;
    ctx.globalAlpha *= 1;
    var fa = ctx.globalAlpha;
    ctx.globalAlpha = fa * .78;
    for (var f = 0; f < k.dors.length; f++) {
      var dd = k.dors[f], u0 = dd[0], u1 = dd[1], hgt = dd[2], spiny = dd[3], n = spiny ? 9 : 6;
      ctx.beginPath();
      ctx.moveTo(X(u0), topY(u0) + .02);
      for (var i = 0; i <= n; i++) {
        var uu = u0 + (u1 - u0) * (i / n);
        var env = spiny ? (.55 + .45 * Math.sin(Math.min(1, (i / n) * 1.6) * Math.PI)) : Math.sin(Math.pow(i / n, .6) * Math.PI) * .9 + .1;
        var tipY = topY(uu) - hgt * env;
        ctx.lineTo(X(uu) - .012, tipY);
        if (spiny && i < n) ctx.lineTo(X(uu + (u1 - u0) / n * .5), tipY + hgt * .28);
      }
      ctx.lineTo(X(u1), topY(u1) + .02);
      ctx.closePath();
      ctx.fill();
    }
    if (k.adipose) {
      ctx.beginPath();
      ctx.ellipse(X(.8), topY(.8) - .01, .06, .022, 0, Math.PI, TAU);
      ctx.fill();
    }
    if (k.anal) {
      var a0 = k.anal[0], a1 = k.anal[1], ah = k.anal[2];
      ctx.beginPath();
      ctx.moveTo(X(a0), botY(a0) - .02);
      ctx.quadraticCurveTo(X(a0 + (a1 - a0) * .2), botY(a0) + ah * 1.1, X(a1) - .02, botY(a1) + ah * .55);
      ctx.lineTo(X(a1), botY(a1) - .02);
      ctx.closePath();
      ctx.fill();
    }
    // Pelvic
    var pu = k.pelv;
    ctx.beginPath();
    ctx.moveTo(X(pu), botY(pu) - .01);
    ctx.lineTo(X(pu + .1), botY(pu + .06) + .075 + .01 * Math.sin(phase * 1.3));
    ctx.lineTo(X(pu + .12), botY(pu + .1) - .01);
    ctx.closePath();
    ctx.fill();

    // Tail fin
    var tb = 1;
    var xp = X(tb) + .01, yp = flex(tb) - .012, hp = prof(k, tb) * .95;
    var T = k.tailL * (.72 + .28 * Math.abs(Math.cos(phase)));
    var sway = .05 * Math.sin(phase - 3.2);
    ctx.globalAlpha = fa * .9;
    ctx.beginPath();
    ctx.moveTo(xp, yp - hp);
    if (k.tail === 'fork') {
      ctx.quadraticCurveTo(xp - T * .45, yp - hp * 1.5, xp - T, yp - hp * 3.3 + sway);
      ctx.quadraticCurveTo(xp - T * .66, yp - hp * .5, xp - T * .56, yp + sway);
      ctx.quadraticCurveTo(xp - T * .66, yp + hp * .5, xp - T, yp + hp * 3.3 + sway);
      ctx.quadraticCurveTo(xp - T * .45, yp + hp * 1.5, xp, yp + hp);
    } else if (k.tail === 'square') {
      ctx.quadraticCurveTo(xp - T * .5, yp - hp * 2.4, xp - T, yp - hp * 2.6 + sway);
      ctx.quadraticCurveTo(xp - T * 1.06, yp + sway, xp - T, yp + hp * 2.6 + sway);
      ctx.quadraticCurveTo(xp - T * .5, yp + hp * 2.4, xp, yp + hp);
    } else {
      ctx.bezierCurveTo(xp - T * .45, yp - hp * 3, xp - T * 1.05, yp - hp * 2.4 + sway, xp - T * 1.06, yp + sway);
      ctx.bezierCurveTo(xp - T * 1.05, yp + hp * 2.4 + sway, xp - T * .45, yp + hp * 3, xp, yp + hp);
    }
    ctx.closePath();
    var tg = ctx.createLinearGradient(xp, 0, xp - T, 0);
    tg.addColorStop(0, mid);
    tg.addColorStop(1, finC);
    ctx.fillStyle = tg;
    ctx.fill();
    if (!k.simple) {
      ctx.strokeStyle = 'rgba(255,255,255,.07)';
      ctx.lineWidth = .004;
      for (var r = -3; r <= 3; r++) {
        ctx.beginPath();
        ctx.moveTo(xp, yp + hp * r * .25);
        ctx.lineTo(xp - T * .95, yp + hp * r * .8 + sway);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = fa;

    // Body
    ctx.beginPath();
    for (var j = 0; j <= N; j++) {
      var u = j / N;
      if (j === 0) ctx.moveTo(X(0) + .006, topY(0) * .5 + botY(0) * .5);
      ctx.lineTo(X(u), topY(u));
    }
    for (var m = N; m >= 0; m--) {
      var v = m / N;
      ctx.lineTo(X(v), botY(v));
    }
    ctx.closePath();
    var H = k.d / 2;
    var g = ctx.createLinearGradient(0, -H, 0, H);
    g.addColorStop(0, top);
    g.addColorStop(.45, mid);
    g.addColorStop(1, bel);
    ctx.fillStyle = g;
    ctx.fill();

    if (!k.simple) {
      ctx.save();
      ctx.clip();
      // Sheen along the upper flank
      var sh = ctx.createLinearGradient(0, -H, 0, H * .3);
      sh.addColorStop(0, 'rgba(255,255,255,0)');
      sh.addColorStop(.55, 'rgba(255,255,255,' + (.16 * (1 - fog)).toFixed(3) + ')');
      sh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sh;
      ctx.fillRect(-.6, -H, 1.2, H * 1.3);
      // Markings
      ctx.fillStyle = 'rgba(8,14,24,' + (.32 * (1 - fog * .7)).toFixed(3) + ')';
      if (k.bars) {
        for (var b = 0; b < k.bars; b++) {
          var bu = .3 + b * (.55 / k.bars);
          ctx.beginPath();
          ctx.ellipse(X(bu), -H * .15 + flex(bu), .022, H * .95, -.08, 0, TAU);
          ctx.fill();
        }
      }
      if (k.blotch) {
        for (var q = 0; q < 6; q++) {
          var qu = .2 + q * .13;
          ctx.beginPath();
          ctx.ellipse(X(qu), flex(qu) - .005, .04, H * .55, .3, 0, TAU);
          ctx.fill();
        }
      }
      if (k.spots) {
        ctx.fillStyle = 'rgba(8,14,24,' + (.22 * (1 - fog)).toFixed(3) + ')';
        for (var s = 0; s < 16; s++) {
          var su = .24 + (s % 8) * .085, sy = (s < 8 ? -.35 : -.05) * H;
          ctx.beginPath();
          ctx.arc(X(su), sy + flex(su), .009, 0, TAU);
          ctx.fill();
        }
      }
      // Belly shadow
      var bs = ctx.createLinearGradient(0, H * .2, 0, H);
      bs.addColorStop(0, 'rgba(0,0,0,0)');
      bs.addColorStop(1, 'rgba(0,8,20,.22)');
      ctx.fillStyle = bs;
      ctx.fillRect(-.6, 0, 1.2, H);
      ctx.restore();

      // Lateral line
      ctx.strokeStyle = 'rgba(255,255,255,' + (.16 * (1 - fog)).toFixed(3) + ')';
      ctx.lineWidth = .0045;
      ctx.beginPath();
      for (var l = 0; l <= 12; l++) {
        var lu = .26 + l * (.72 / 12);
        var ly = -prof(k, lu) * .42 + flex(lu) - .01;
        if (l === 0) ctx.moveTo(X(lu), ly); else ctx.lineTo(X(lu), ly);
      }
      ctx.stroke();
      // Gill cover
      ctx.strokeStyle = 'rgba(4,10,20,' + (.35 * (1 - fog)).toFixed(3) + ')';
      ctx.lineWidth = .007;
      var gu = k.eye + .14;
      ctx.beginPath();
      ctx.moveTo(X(gu) + .01, topY(gu) * .7);
      ctx.quadraticCurveTo(X(gu) - .03, 0, X(gu) + .015, botY(gu) * .75);
      ctx.stroke();
      // Peacock eye-spot on the tail base
      if (k.ocellus) {
        ctx.fillStyle = 'rgba(214,170,90,' + (.55 * (1 - fog)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(X(.96), flex(.96) - .01, .032, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(10,16,26,.7)';
        ctx.beginPath(); ctx.arc(X(.96), flex(.96) - .01, .018, 0, TAU); ctx.fill();
      }
      // Mouth
      ctx.strokeStyle = 'rgba(4,10,20,.45)';
      ctx.lineWidth = .006;
      ctx.beginPath();
      ctx.moveTo(X(0) + .004, topY(0) * .25 + botY(0) * .55);
      ctx.lineTo(X(.07), botY(.06) * .2);
      ctx.stroke();
    }

    // Pectoral fin (on top, gently flapping)
    var pcU = k.eye + .19;
    ctx.save();
    ctx.translate(X(pcU), prof(k, pcU) * .25 + flex(pcU));
    ctx.rotate(.5 + .22 * Math.sin(phase * 1.7));
    ctx.fillStyle = 'rgba(' + k.c[1].join(',') + ',' + (.5 * (1 - fog * .6)).toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-.05, -.03, -.11, .005);
    ctx.quadraticCurveTo(-.06, .03, 0, 0);
    ctx.fill();
    ctx.restore();

    // Eye
    var ex = X(k.eye), ey = topY(k.eye) * .48 + flex(k.eye) - .004, er = k.simple ? .028 : .024;
    ctx.fillStyle = mix([200, 206, 196], water, fog * .6);
    ctx.beginPath(); ctx.arc(ex, ey, er * 1.25, 0, TAU); ctx.fill();
    ctx.fillStyle = '#05080e';
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
    if (!k.simple) {
      ctx.fillStyle = 'rgba(255,255,255,' + (.75 * (1 - fog)).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(ex + er * .35, ey - er * .35, er * .32, 0, TAU); ctx.fill();
    }
    // Catfish barbels
    if (k.barbels) {
      ctx.strokeStyle = mix([150, 160, 170], water, fog * .7);
      ctx.lineWidth = .006;
      ctx.lineCap = 'round';
      for (var w = 0; w < 3; w++) {
        var by = botY(0) * (.1 + w * .35);
        ctx.beginPath();
        ctx.moveTo(X(.02), by);
        ctx.quadraticCurveTo(X(-.08), by + .05 + w * .02 + .01 * Math.sin(phase + w), X(-.04) - w * .02, by + .12 + w * .04);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  window.FWFish = { KINDS: KINDS, drawFish: drawFish };

  /* ------------------------------------------------------------------
     Boot scene
     ------------------------------------------------------------------ */

  var boot = document.getElementById('boot');
  if (!boot) return;
  window.__bootStart = performance.now();

  var WORDS = ['FishWise SG', 'Bedok Jetty', 'Barramundi', 'Lower Seletar', 'Peacock bass', 'Changi Beach', 'Mangrove jack',
    'Woodlands Jetty', 'Snakehead', 'Pandan Reservoir', 'Javelin grunter', 'Sembawang Jetty', 'Tilapia', 'Kranji',
    'Goatee croaker', 'Punggol Point', 'Pufferfish', 'Marina Reservoir', 'Scorpionfish', 'Jurong Lake', 'Stingray',
    'Pasir Ris', 'Catfish', 'East Coast', 'MacRitchie', 'Upper Seletar', 'Pulau Ubin', 'Catch & release', 'Tight lines',
    'Blue railings', 'Micro-barb hooks', 'Bedok Reservoir', 'Lower Peirce', 'Serangoon Reservoir', 'Geylang River'];

  var STATUS = [
    [0, 'Waking the water'],
    [.08, 'Mapping Bedok Jetty'], [.14, 'Mapping Lower Seletar Reservoir'], [.2, 'Mapping Changi Beach Park'],
    [.26, 'Mapping Woodlands Waterfront Jetty'], [.32, 'Mapping 43 spots'],
    [.4, 'Spotting Barramundi'], [.46, 'Spotting Peacock bass'], [.52, 'Spotting Mangrove jack'], [.58, 'Spotting 12 species'],
    [.66, 'Reading NEA weather'], [.74, 'Rigging 22 lessons'], [.84, 'Checking the blue railings'], [.93, 'Casting off'],
  ];

  var field = document.getElementById('boot-field');
  var scene = document.getElementById('boot-scene');
  var fctx = field.getContext('2d');
  var sctx = scene.getContext('2d');
  var stEl = document.getElementById('boot-status');
  var pcEl = document.getElementById('boot-pct');
  var W = 0, Hh = 0, dpr = 1, horizon = 0, words = [], fish = [], school = [], anglers = [], skyline = [], stars = [], motes = [];
  var mx = -9999, my = -9999, lx = -9999, ly = -9999, la = 0;
  var t0 = performance.now();
  var p = 0;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  function layoutWords() {
    words = [];
    fctx.font = '500 12px "JetBrains Mono", ui-monospace, Consolas, monospace';
    var lh = W < 700 ? 26 : 30;
    for (var y = 18; y < Hh + lh; y += lh) {
      var x = -rnd(0, 120);
      while (x < W + 40) {
        var txt = pick(WORDS).toUpperCase();
        var w = fctx.measureText(txt).width;
        words.push({ t: txt, shown: txt, x: x, y: y, w: w, s: Math.random(), on: Math.random() < .6, until: 0 });
        x += w + rnd(26, 60);
      }
    }
  }

  function makeScene() {
    var small = W < 700;
    horizon = Math.round(Hh * (small ? .3 : .34));
    // Fish: three depth layers + a baitfish school
    fish = [];
    var kinds = ['barra', 'peacock', 'snake', 'tilapia', 'jack', 'grunter', 'catfish'];
    var base = Math.max(90, Math.min(190, W * .11));
    var count = small ? 13 : 22;
    for (var i = 0; i < count; i++) {
      var layer = i % 3; // 0 far, 1 mid, 2 near
      var sc = layer === 0 ? rnd(.38, .55) : layer === 1 ? rnd(.65, .95) : rnd(1.1, 1.55);
      var kind = kinds[i % kinds.length];
      var dir = Math.random() < .5 ? 1 : -1;
      fish.push({
        kind: kind, L: base * sc * (kind === 'snake' ? 1.25 : kind === 'catfish' ? 1.05 : 1), dir: dir, layer: layer,
        x: rnd(-.1, 1.1) * W, y: rnd(horizon + 60, Hh - 40), vy: rnd(-.08, .08),
        sp: (layer === 0 ? rnd(.18, .3) : layer === 1 ? rnd(.32, .5) : rnd(.5, .8)) * (W / 1440 + .4),
        ph: rnd(0, TAU), bob: rnd(0, TAU), fog: layer === 0 ? .62 : layer === 1 ? .32 : .08,
      });
    }
    fish.sort(function (a, b) { return a.layer - b.layer; });
    // Baitfish school
    school = [];
    var n = small ? 26 : 46;
    for (var s = 0; s < n; s++) {
      school.push({ ox: rnd(-1, 1), oy: rnd(-1, 1), ph: rnd(0, TAU), L: rnd(16, 26) * (W / 1440 + .45) });
    }
    // Anglers on the jetty
    var jEnd = W * (small ? .78 : .6);
    anglers = [];
    var poses = small ? ['stand', 'sit', 'cast', 'kid'] : ['stand', 'sit', 'cast', 'stand', 'kid', 'sit', 'stand'];
    for (var a = 0; a < poses.length; a++) {
      anglers.push({ pose: poses[a], x: W * .06 + (jEnd - W * .1) * ((a + .5) / poses.length) + rnd(-12, 12), ph: rnd(0, TAU), side: Math.random() < .75 ? 1 : -1 });
    }
    // Distant skyline on the far right
    skyline = [];
    var x = jEnd + 40;
    while (x < W + 20) {
      var bw = rnd(10, 34), bh = rnd(14, Math.min(110, Hh * .14));
      if (Math.random() < .12) bh *= 1.6;
      skyline.push({ x: x, w: bw, h: bh, lit: Math.random() });
      x += bw + rnd(0, 6);
    }
    stars = [];
    for (var k = 0; k < 70; k++) stars.push({ x: rnd(0, W), y: rnd(0, horizon * .85), r: rnd(.3, 1.1), s: rnd(0, TAU) });
    motes = [];
    for (var m = 0; m < (small ? 40 : 80); m++) motes.push({ x: rnd(0, W), y: rnd(horizon, Hh), r: rnd(.4, 1.6), v: rnd(.05, .25), s: rnd(0, TAU) });
  }

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = boot.clientWidth; Hh = boot.clientHeight;
    [field, scene].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(Hh * dpr); });
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutWords();
    makeScene();
  }

  /* ---- word field ---- */
  var SCR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function drawWords(t, age) {
    fctx.clearRect(0, 0, W, Hh);
    fctx.font = '500 12px "JetBrains Mono", ui-monospace, Consolas, monospace';
    fctx.textBaseline = 'middle';
    var R = Math.max(W, Hh) * Math.min(1, age / 1600) * .95;
    for (var i = 0; i < words.length; i++) {
      var wd = words[i];
      var cx = wd.x + wd.w / 2;
      if (Math.hypot(cx - W / 2, wd.y - Hh * .55) > R) continue;
      var wave = .5 + .5 * Math.sin(t * .0007 + wd.x * .006 + wd.y * .015 + wd.s * 6.28);
      var near = Math.max(0, 1 - Math.hypot(cx - lx, wd.y - ly) / 220) * la;
      if (near > .35 && t > wd.until) wd.until = t + 650;
      if (!reduce && Math.random() < .0009) wd.until = t + 650;
      if (t < wd.until) {
        var k = 1 - (wd.until - t) / 650, out = '';
        for (var c = 0; c < wd.t.length; c++) out += (c / wd.t.length < k || wd.t[c] === ' ') ? wd.t[c] : SCR[(Math.random() * 26) | 0];
        wd.shown = out;
      } else wd.shown = wd.t;
      var a = (wd.on ? .035 + .055 * wave : .015) + near * .85;
      if (a < .02) continue;
      fctx.fillStyle = near > .3 ? 'rgba(140,204,255,' + a.toFixed(3) + ')' : 'rgba(190,212,240,' + a.toFixed(3) + ')';
      fctx.fillText(wd.shown, wd.x, wd.y);
    }
  }

  /* ---- silhouettes ---- */
  var INK = '#02050b';

  function drawAngler(a, deckY, s, t) {
    var x = a.x, f = a.side;
    var c = sctx;
    c.save();
    c.translate(x, deckY);
    c.scale(f * s, s);
    c.fillStyle = INK;
    c.strokeStyle = INK;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    var tip;
    if (a.pose === 'sit') {
      // stool / cooler box
      c.fillRect(-7, -9, 14, 9);
      c.lineWidth = 3.2;
      c.beginPath(); c.moveTo(-2, -12); c.lineTo(6, -12); c.lineTo(7, 0); c.stroke(); // legs
      c.beginPath(); c.moveTo(-4, -12); c.lineTo(-3, -28); c.stroke(); // torso
      c.lineWidth = 7; c.beginPath(); c.moveTo(-3, -14); c.lineTo(-3, -27); c.stroke();
      c.beginPath(); c.arc(-2, -33, 4.6, 0, TAU); c.fill();
      c.fillRect(-7, -37.5, 10, 2.2); // cap brim
      c.lineWidth = 2.6; c.beginPath(); c.moveTo(-2, -25); c.lineTo(7, -18); c.stroke();
      var bend = 3 * Math.sin(t * .0016 + a.ph);
      c.lineWidth = 1.3; c.beginPath(); c.moveTo(6, -17); c.quadraticCurveTo(26, -40, 46, -46 + bend); c.stroke();
      tip = [46, -46 + bend];
    } else if (a.pose === 'cast') {
      var cyc = (t * .00028 + a.ph) % 1;
      var ang = cyc < .12 ? -2.2 + (cyc / .12) * 1.6 : cyc < .2 ? -0.6 : -0.6 - Math.max(0, (cyc - .85) / .15) * 1.6;
      c.lineWidth = 3.4;
      c.beginPath(); c.moveTo(-3, 0); c.lineTo(0, -16); c.lineTo(4, 0); c.stroke();
      c.lineWidth = 7.5; c.beginPath(); c.moveTo(0, -16); c.lineTo(0, -33); c.stroke();
      c.beginPath(); c.arc(0, -39, 4.8, 0, TAU); c.fill();
      c.fillRect(-4, -43.6, 10, 2.2);
      var hx = 6, hy = -28;
      c.lineWidth = 2.6; c.beginPath(); c.moveTo(1, -31); c.lineTo(hx, hy); c.stroke();
      var L2 = 52;
      var tx = hx + Math.cos(ang) * L2, ty = hy + Math.sin(ang) * L2;
      c.lineWidth = 1.4; c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + Math.cos(ang - .08) * L2 * .6, hy + Math.sin(ang - .08) * L2 * .6, tx, ty); c.stroke();
      tip = [tx, ty];
    } else {
      var kid = a.pose === 'kid' ? .72 : 1;
      c.scale(kid, kid);
      c.lineWidth = 3.4;
      c.beginPath(); c.moveTo(-3, 0); c.lineTo(-1, -16); c.lineTo(3, 0); c.stroke();
      c.lineWidth = 7.5; c.beginPath(); c.moveTo(-1, -16); c.lineTo(0, -33); c.stroke();
      c.beginPath(); c.arc(1, -39, 4.8, 0, TAU); c.fill();
      if (a.pose !== 'kid') c.fillRect(-3, -43.6, 10, 2.2);
      c.lineWidth = 2.6; c.beginPath(); c.moveTo(1, -30); c.lineTo(8, -24); c.stroke();
      var bend2 = 4 * Math.sin(t * .0013 + a.ph);
      c.lineWidth = 1.4; c.beginPath(); c.moveTo(4, -21); c.quadraticCurveTo(30, -44, 58, -38 + bend2); c.stroke();
      tip = [58, -38 + bend2];
      tip = [tip[0] * kid, tip[1] * kid];
    }
    c.restore();
    return [x + tip[0] * f * s, deckY + tip[1] * s];
  }

  function drawSceneTop(t) {
    var c = sctx, small = W < 700;
    // sky
    var sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#02040a');
    sky.addColorStop(.7, '#061128');
    sky.addColorStop(1, '#0c2348');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, horizon);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      c.fillStyle = 'rgba(200,222,255,' + (.25 + .35 * Math.sin(t * .001 + st.s)).toFixed(3) + ')';
      c.fillRect(st.x, st.y, st.r, st.r);
    }
    // moon
    var mxp = W * (small ? .82 : .78), myp = horizon * .32;
    var mg = c.createRadialGradient(mxp, myp, 0, mxp, myp, 120);
    mg.addColorStop(0, 'rgba(170,210,255,.28)');
    mg.addColorStop(1, 'rgba(170,210,255,0)');
    c.fillStyle = mg;
    c.fillRect(mxp - 120, myp - 120, 240, 240);
    c.fillStyle = '#d9e9ff';
    c.beginPath(); c.arc(mxp, myp, 13, 0, TAU); c.fill();
    c.fillStyle = 'rgba(2,6,14,.55)';
    c.beginPath(); c.arc(mxp + 6, myp - 3, 12, 0, TAU); c.fill();

    // distant skyline
    for (var b = 0; b < skyline.length; b++) {
      var bd = skyline[b];
      c.fillStyle = '#040a17';
      c.fillRect(bd.x, horizon - bd.h, bd.w, bd.h);
      if (bd.lit > .35) {
        c.fillStyle = 'rgba(124,196,255,' + (.25 + .25 * Math.sin(t * .0006 + bd.lit * 9)).toFixed(3) + ')';
        for (var wy = horizon - bd.h + 5; wy < horizon - 4; wy += 7) {
          for (var wx = bd.x + 3; wx < bd.x + bd.w - 3; wx += 6) if (((wx * 13 + wy * 7) | 0) % 5 === 0) c.fillRect(wx, wy, 1.5, 2);
        }
      }
    }

    // jetty
    var jEnd = W * (small ? .78 : .6), deckY = horizon - 9;
    c.fillStyle = INK;
    c.fillRect(-10, deckY, jEnd + 10, 6);
    c.fillRect(-10, deckY - 21, jEnd + 10, 1.6);
    c.fillRect(-10, deckY - 12, jEnd + 10, 1.1);
    for (var px = 0; px < jEnd; px += 34) c.fillRect(px, deckY - 21, 2, 21);
    c.fillRect(jEnd - 2, deckY - 21, 3, 21);
    // lamps
    for (var lx2 = W * .12; lx2 < jEnd; lx2 += W * (small ? .3 : .17)) {
      c.fillRect(lx2, deckY - 62, 2.2, 62);
      c.fillRect(lx2 - 5, deckY - 64, 12, 3);
      var lg = c.createRadialGradient(lx2 + 1, deckY - 60, 0, lx2 + 1, deckY - 60, 70);
      lg.addColorStop(0, 'rgba(190,225,255,.32)');
      lg.addColorStop(1, 'rgba(190,225,255,0)');
      c.fillStyle = lg;
      c.fillRect(lx2 - 70, deckY - 130, 140, 140);
      c.fillStyle = INK;
    }
    // pylons above the waterline
    for (var py = 18; py < jEnd; py += 52) c.fillRect(py, deckY + 6, 4, horizon - deckY);

    // anglers + lines
    var sc = small ? .85 : Math.max(.9, Math.min(1.25, W / 1300));
    var tips = [];
    for (var a = 0; a < anglers.length; a++) tips.push([anglers[a], drawAngler(anglers[a], deckY, sc, t)]);
    return { tips: tips, deckY: deckY, jEnd: jEnd };
  }

  function drawWater(t, top) {
    var c = sctx;
    var wg = c.createLinearGradient(0, horizon, 0, Hh);
    wg.addColorStop(0, '#0b2a5a');
    wg.addColorStop(.25, '#08193a');
    wg.addColorStop(.7, '#040c1e');
    wg.addColorStop(1, '#02050c');
    c.fillStyle = wg;
    c.fillRect(0, horizon, W, Hh - horizon);

    // god rays
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (var r = 0; r < 6; r++) {
      var rx = W * (.1 + r * .17) + Math.sin(t * .00025 + r) * 40;
      var rg = c.createLinearGradient(0, horizon, 0, Hh * .9);
      rg.addColorStop(0, 'rgba(110,170,255,.075)');
      rg.addColorStop(1, 'rgba(110,170,255,0)');
      c.fillStyle = rg;
      c.beginPath();
      c.moveTo(rx - 18, horizon);
      c.lineTo(rx + 22, horizon);
      c.lineTo(rx + 150 + r * 10, Hh);
      c.lineTo(rx - 40, Hh);
      c.closePath();
      c.fill();
    }
    c.restore();

    // underwater pylons
    c.fillStyle = 'rgba(2,6,14,.55)';
    for (var py = 18; py < top.jEnd; py += 52) {
      var pg = c.createLinearGradient(0, horizon, 0, horizon + Hh * .35);
      pg.addColorStop(0, 'rgba(2,6,14,.75)');
      pg.addColorStop(1, 'rgba(2,6,14,0)');
      c.fillStyle = pg;
      c.fillRect(py, horizon, 4, Hh * .35);
    }

    // fishing lines + bobbers
    for (var i = 0; i < top.tips.length; i++) {
      var tip = top.tips[i][1], ang = top.tips[i][0];
      var ex = tip[0] + 26 * (ang.side || 1) + 6 * Math.sin(t * .0012 + ang.ph);
      c.strokeStyle = 'rgba(200,225,255,.35)';
      c.lineWidth = .7;
      c.beginPath();
      c.moveTo(tip[0], tip[1]);
      c.quadraticCurveTo((tip[0] + ex) / 2, (tip[1] + horizon) / 2 + 8, ex, horizon);
      c.stroke();
      // bobber + ripple
      c.fillStyle = 'rgba(214,236,255,.85)';
      c.beginPath(); c.arc(ex, horizon - 1 + Math.sin(t * .003 + ang.ph) * 1.2, 2.2, 0, TAU); c.fill();
      var rp = ((t * .0006 + ang.ph) % 1);
      c.strokeStyle = 'rgba(160,210,255,' + (.35 * (1 - rp)).toFixed(3) + ')';
      c.beginPath(); c.ellipse(ex, horizon + 1, 4 + rp * 22, 1 + rp * 3, 0, 0, TAU); c.stroke();
      // line below the surface
      var depth = horizon + 70 + (i % 3) * 50;
      c.strokeStyle = 'rgba(170,210,255,.13)';
      c.beginPath(); c.moveTo(ex, horizon); c.lineTo(ex + 4 * Math.sin(t * .001 + i), depth); c.stroke();
      c.strokeStyle = 'rgba(200,225,255,.4)';
      c.beginPath(); c.arc(ex + 4 * Math.sin(t * .001 + i) - 2, depth + 3, 3, 0, Math.PI); c.stroke();
    }

    // surface shimmer
    for (var s = 0; s < 46; s++) {
      var sx = ((s * 97.3 + t * .02 * (s % 2 ? 1 : -1)) % (W + 80)) - 40;
      var sy = horizon + 2 + (s % 7) * 3.2;
      c.fillStyle = 'rgba(150,205,255,' + (.06 + .1 * Math.sin(t * .002 + s)).toFixed(3) + ')';
      c.fillRect(sx, sy, 14 + (s % 5) * 6, 1);
    }
    c.fillStyle = 'rgba(140,200,255,.35)';
    c.fillRect(0, horizon, W, 1);
  }

  function drawLife(t, dt) {
    var c = sctx;
    var water = [6, 20, 44];
    // marine snow
    for (var m = 0; m < motes.length; m++) {
      var mo = motes[m];
      mo.y -= mo.v * dt * .02;
      mo.x += Math.sin(t * .0005 + mo.s) * .1;
      if (mo.y < horizon) { mo.y = Hh; mo.x = rnd(0, W); }
      c.fillStyle = 'rgba(170,210,255,' + (.12 + .12 * Math.sin(t * .002 + mo.s)).toFixed(3) + ')';
      c.beginPath(); c.arc(mo.x, mo.y, mo.r, 0, TAU); c.fill();
    }
    // baitfish school (moves as one, members jostle)
    var scx = ((t * .045) % (W + 600)) - 300, scy = horizon + (Hh - horizon) * .38 + Math.sin(t * .0004) * 40;
    for (var b = 0; b < school.length; b++) {
      var sb = school[b];
      var bx = scx + sb.ox * 150 + Math.sin(t * .0011 + sb.ph) * 8;
      var by = scy + sb.oy * 52 + Math.cos(t * .0013 + sb.ph) * 6;
      c.globalAlpha = .55;
      drawFish(c, 'bait', bx, by, sb.L, 1, Math.sin(t * .001 + sb.ph) * .08, t * .018 + sb.ph, .35, water);
    }
    c.globalAlpha = 1;
    // bigger fish
    for (var i = 0; i < fish.length; i++) {
      var f = fish[i];
      f.x += f.dir * f.sp * dt * .06;
      f.bob += dt * .0009;
      var yy = f.y + Math.sin(f.bob) * 10;
      if (f.dir > 0 && f.x > W + f.L) { f.x = -f.L; f.y = rnd(horizon + 60, Hh - 40); }
      if (f.dir < 0 && f.x < -f.L) { f.x = W + f.L; f.y = rnd(horizon + 60, Hh - 40); }
      f.ph += dt * (.006 + f.sp * .004);
      // keep the middle calm for the headline
      var cx = Math.abs(f.x - W / 2) / (W / 2), cy = Math.abs(yy - Hh * .58) / (Hh * .25);
      var calm = f.layer === 2 && cx < .45 && cy < 1 ? .35 : 1;
      c.globalAlpha = (f.layer === 0 ? .55 : f.layer === 1 ? .8 : .95) * calm;
      drawFish(c, f.kind, f.x, yy, f.L, f.dir, Math.cos(f.bob) * .05, f.ph, f.fog, water);
    }
    c.globalAlpha = 1;
    // seabed silhouette
    c.fillStyle = '#010309';
    c.beginPath();
    c.moveTo(0, Hh);
    for (var x = 0; x <= W; x += 24) c.lineTo(x, Hh - 18 - 14 * Math.sin(x * .013) - 8 * Math.sin(x * .041));
    c.lineTo(W, Hh);
    c.fill();
    c.strokeStyle = 'rgba(30,70,110,.5)';
    c.lineWidth = 2;
    for (var g = 10; g < W; g += 38) {
      var gh = 30 + (g * 7) % 40, sw = Math.sin(t * .0012 + g) * 8;
      c.beginPath(); c.moveTo(g, Hh - 14); c.quadraticCurveTo(g + sw * .5, Hh - 14 - gh * .5, g + sw, Hh - 14 - gh); c.stroke();
    }
  }

  var last = performance.now();
  function frame(t) {
    if (!document.getElementById('boot')) return;
    var dt = Math.min(48, t - last);
    last = t;
    var age = t - t0;
    if (mx > -999) {
      if (lx < -999) { lx = mx; ly = my; }
      lx += (mx - lx) * .18; ly += (my - ly) * .18; la += (1 - la) * .08;
    }
    drawWords(t, age);
    sctx.clearRect(0, 0, W, Hh);
    var top = drawSceneTop(t);
    sctx.save();
    sctx.globalAlpha = .9;
    drawWater(t, top);
    sctx.restore();
    drawLife(t, dt);
    if (!reduce) requestAnimationFrame(frame);
  }

  /* ---- progress + status ---- */
  function statusFor(v) {
    var s = STATUS[0][1];
    for (var i = 0; i < STATUS.length; i++) if (v >= STATUS[i][0]) s = STATUS[i][1];
    return s;
  }
  window.__boot = {
    set: function (v, text) {
      p = Math.max(p, Math.min(1, v));
      boot.style.setProperty('--p', p.toFixed(3));
      var s = text || statusFor(p);
      if (stEl && stEl.textContent !== s) stEl.textContent = s;
      if (pcEl) pcEl.textContent = String(Math.round(p * 100)).padStart(2, '0');
    },
  };
  // Full intro on the first visit only; afterwards a short one.
  var seen = false;
  try { seen = localStorage.getItem('fishwise.introSeen') === '1'; localStorage.setItem('fishwise.introSeen', '1'); } catch (e) { /* storage blocked */ }
  if (seen) boot.classList.add('is-quick');
  window.__bootMin = reduce ? 300 : seen ? 1500 : 6800;
  var iv = setInterval(function () {
    if (!document.getElementById('boot')) return clearInterval(iv);
    var e = (performance.now() - t0) / window.__bootMin;
    window.__boot.set(Math.min(.97, 1 - Math.pow(1 - Math.min(1, e), 1.6)));
  }, 60);

  size();
  window.addEventListener('resize', size);
  boot.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; });
  requestAnimationFrame(frame);

  // Safety net: never leave the intro up if the app fails to start.
  setTimeout(function () {
    if (!document.getElementById('boot')) return;
    boot.classList.add('is-out');
    document.documentElement.classList.remove('is-booting');
    setTimeout(function () { boot.remove(); }, 1400);
  }, 13000);
})();
