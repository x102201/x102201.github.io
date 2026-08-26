/* WebAudio 合成音效 + 舞台粒子 */
(function (G) {
  'use strict';

  var AC = null;
  var reduced = false;
  var lowFps = false;
  var fpsFrames = 0;
  var fpsLast = 0;

  G.reducedMotion = function () {
    if (reduced || lowFps) return true;
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  };

  G.ensureAudio = function () {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') AC.resume();
  };

  function tone(freq, dur, type, vol, delay) {
    if (!AC || !G.S || !G.S.sound) return;
    var t0 = AC.currentTime + (delay || 0);
    var osc = AC.createOscillator();
    var g = AC.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(AC.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  G.SFX = {
    click: function () { tone(660, 0.08, 'square', 0.05); },
    play: function () { tone(520, 0.1, 'triangle', 0.07); tone(780, 0.12, 'triangle', 0.06, 0.08); },
    upgrade: function () { tone(440, 0.1, 'sine', 0.08); tone(660, 0.12, 'sine', 0.08, 0.08); tone(880, 0.14, 'sine', 0.07, 0.16); },
    attack: function () { tone(180, 0.12, 'sawtooth', 0.07); tone(90, 0.16, 'triangle', 0.06, 0.04); },
    coin: function () { tone(880, 0.1, 'sine', 0.1); tone(1320, 0.14, 'sine', 0.1, 0.1); },
    legendary: function () {
      [523, 659, 784, 1047, 1318].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.09, i * 0.09); });
    },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.16, 'triangle', 0.1, i * 0.12); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.18, 'sine', 0.09, i * 0.15); }); },
    ach: function () { [784, 988, 1175].forEach(function (f, i) { tone(f, 0.12, 'square', 0.05, i * 0.09); }); },
    skill: function () { tone(700, 0.1, 'square', 0.05); tone(500, 0.12, 'sine', 0.05, 0.08); },
    draw: function () { tone(400, 0.07, 'triangle', 0.04); }
  };

  /* 特效粒子 */
  var fxCv, fxCtx, confetti = [], trails = [];
  var PARTICLE_CAP = 120;

  G.initFx = function () {
    fxCv = document.getElementById('fx');
    if (!fxCv) return;
    fxCtx = fxCv.getContext('2d');
    var w = 420, h = 800, dpr;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      fxCv.width = w * dpr; fxCv.height = h * dpr;
      fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    fpsLast = performance.now();
    (function loop(now) {
      fpsFrames++;
      if (now - fpsLast > 2000) {
        var fps = fpsFrames / ((now - fpsLast) / 1000);
        if (fps < 28) {
          lowFps = true;
          document.documentElement.classList.add('reduced-motion');
        }
        fpsFrames = 0;
        fpsLast = now;
      }
      fxCtx.clearRect(0, 0, w, h);
      if (!G.reducedMotion()) {
        var i, c;
        for (i = confetti.length - 1; i >= 0; i--) {
          c = confetti[i];
          c.x += c.vx; c.y += c.vy; c.vy += 0.12; c.rot += c.vr; c.a -= 0.008;
          if (c.y > h + 30 || c.a <= 0) { confetti.splice(i, 1); continue; }
          fxCtx.save();
          fxCtx.translate(c.x, c.y); fxCtx.rotate(c.rot);
          fxCtx.globalAlpha = Math.max(0, c.a);
          fxCtx.fillStyle = c.col;
          fxCtx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2);
          fxCtx.restore();
        }
        for (i = trails.length - 1; i >= 0; i--) {
          c = trails[i];
          c.t += 0.08;
          if (c.t >= 1) { trails.splice(i, 1); continue; }
          fxCtx.strokeStyle = c.col;
          fxCtx.globalAlpha = 1 - c.t;
          fxCtx.lineWidth = 3;
          fxCtx.beginPath();
          fxCtx.moveTo(c.x0, c.y0);
          fxCtx.lineTo(c.x0 + (c.x1 - c.x0) * c.t, c.y0 + (c.y1 - c.y0) * c.t);
          fxCtx.stroke();
        }
        fxCtx.globalAlpha = 1;
      }
      requestAnimationFrame(loop);
    })(performance.now());
  };

  G.burst = function (x, y, n) {
    if (G.reducedMotion() || !fxCtx) return;
    var cols = ['#38bdf8', '#22d3ee', '#fb923c', '#f97316', '#e879f9', '#fbbf24', '#4ade80'];
    var cx = x !== undefined ? x : 210;
    var cy = y !== undefined ? y : 320;
    var add = Math.min(n || 60, PARTICLE_CAP - confetti.length);
    for (var i = 0; i < add; i++) {
      var ang = Math.random() * 6.28;
      var sp = 2 + Math.random() * 7;
      confetti.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 3,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
        s: 6 + Math.random() * 8, a: 0.9, col: G.pick(cols)
      });
    }
  };

  G.attackTrail = function (x0, y0, x1, y1, col) {
    if (G.reducedMotion()) return;
    trails.push({ x0: x0, y0: y0, x1: x1, y1: y1, t: 0, col: col || '#fbbf24' });
  };

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      reduced = true;
      document.documentElement.classList.add('reduced-motion');
    }
  }
})(window.G102 = window.G102 || {});
