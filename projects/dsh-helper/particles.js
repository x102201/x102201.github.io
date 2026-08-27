/**
 * DSHHelper particle background — project-local only.
 */
(function () {
  var CANVAS = ".dsh-helper-particles";
  var BANNER_ID = "banner-dsh-helper";

  function boot() {
    var canvas = document.querySelector(CANVAS);
    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      canvas.remove();
      return;
    }

    var mode = canvas.getAttribute("data-particles-mode") || "detail";
    canvas.style.pointerEvents = "none";
  var PALETTE = ["#6CA6FF", "#5B96F5", "#3B7BED", "#2563EB", "#1D4ED8"];

  var ctx = canvas.getContext("2d");
  var particles = [];
  var width = 0;
  var height = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var rafId = 0;
  var time = 0;
  var scrollY = 0;
  var resizeObserver = null;

  var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function isEmbeddedHome() {
    return (
      mode === "home" &&
      canvas.parentElement &&
      canvas.parentElement.id === BANNER_ID
    );
  }

  function dshBannerEl() {
    if (isEmbeddedHome()) return canvas.parentElement;
    return document.getElementById(BANNER_ID);
  }

  function scrollFade() {
    if (isEmbeddedHome()) return 1;
    return Math.max(0, Math.min(1, 1 - scrollY / 520));
  }

  function spawnZone() {
    if (isEmbeddedHome()) return height;
    if (mode === "home") return height * 0.88;
    return height * 0.62;
  }

  function wrapLimitY() {
    if (isEmbeddedHome() || mode === "home") return height;
    return height * 0.65;
  }

  function particleCount() {
    if (isEmbeddedHome()) {
      var area = width * height;
      return Math.min(56, Math.max(28, Math.floor(area / 14000)));
    }
    if (mode === "home") return window.innerWidth < 768 ? 28 : 42;
    return window.innerWidth < 768 ? 32 : 48;
  }

  function makeParticle() {
    var roll = Math.random();
    var type = roll < 0.42 ? "orb" : roll < 0.68 ? "spark" : roll < 0.88 ? "ring" : "wave";
    var depth = rand(0.35, 1);

    return {
      type: type,
      x: rand(0, width),
      y: rand(0, spawnZone()),
      vx: rand(-0.12, 0.12) * depth,
      vy: rand(-0.08, 0.08) * depth,
      size:
        type === "orb"
          ? rand(2.5, 5.5) * depth
          : type === "ring"
            ? rand(6, 14) * depth
            : rand(1.5, 3),
      color: pick(PALETTE),
      depth: depth,
      phase: rand(0, Math.PI * 2),
      waveW: rand(10, 22) * depth,
      waveCurve: rand(0.35, 0.85),
      opacity: rand(0.2, 0.52) * depth,
    };
  }

  function spawnParticles() {
    particles = [];
    for (var i = 0, n = particleCount(); i < n; i++) {
      particles.push(makeParticle());
    }
    particles.sort(function (a, b) {
      return a.depth - b.depth;
    });
  }

  function applyCanvasSize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spawnParticles();
  }

  function resize() {
    if (isEmbeddedHome()) {
      var banner = canvas.parentElement;
      var rect = banner.getBoundingClientRect();
      applyCanvasSize(rect.width, Math.max(rect.height, banner.scrollHeight || 0));
      return;
    }
    applyCanvasSize(window.innerWidth, window.innerHeight);
  }

  function wrap(p) {
    var m = 24;
    var yMax = wrapLimitY();
    if (p.x < -m) p.x = width + m;
    if (p.x > width + m) p.x = -m;
    if (p.y < -m) p.y = yMax + m;
    if (p.y > yMax + m) p.y = -m;
  }

  function setPointer(clientX, clientY) {
    if (isEmbeddedHome()) {
      var banner = canvas.parentElement;
      var rect = banner.getBoundingClientRect();
      var inBanner =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      var copyMax = rect.top + rect.height * 0.58;

      mouse.tx = clientX - rect.left;
      mouse.ty = clientY - rect.top;
      mouse.active = inBanner && clientY <= copyMax;
      return;
    }

    if (mode === "detail") {
      var hero = document.querySelector(".dsh-hero");
      mouse.tx = clientX;
      mouse.ty = clientY;
      if (!hero) {
        mouse.active = false;
        return;
      }
      var hrect = hero.getBoundingClientRect();
      mouse.active =
        clientX >= hrect.left &&
        clientX <= hrect.right &&
        clientY >= hrect.top &&
        clientY <= hrect.bottom;
      return;
    }

    mouse.tx = clientX;
    mouse.ty = clientY;
    mouse.active = false;
  }

  function applyMouseForce(p) {
    if (!mouse.active) return;

    var dx = p.x - mouse.x;
    var dy = p.y - mouse.y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var radius = (isEmbeddedHome() ? 100 : 130) + p.depth * 70;

    if (dist < radius) {
      var t = 1 - dist / radius;
      var ease = t * t;
      var repulse = ease * 0.045 * p.depth;
      p.vx += (dx / dist) * repulse;
      p.vy += (dy / dist) * repulse;
      var swirl = ease * 0.018;
      p.vx += (-dy / dist) * swirl;
      p.vy += (dx / dist) * swirl;
    }

    if (!isEmbeddedHome()) {
      p.vx += (mouse.x - width * 0.5) * 0.000015 * p.depth;
    }
  }

  function updateParticle(p) {
    applyMouseForce(p);
    p.vx += Math.sin(time * 0.0008 + p.phase) * 0.003 * p.depth;
    p.vy += Math.cos(time * 0.0006 + p.phase * 1.3) * 0.002 * p.depth;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.x += p.vx;
    p.y += p.vy;
    wrap(p);
  }

  function hexAlpha(hex, a) {
    if (a <= 0) return "rgba(0,0,0,0)";
    var h = hex.replace("#", "");
    return (
      "rgba(" +
      parseInt(h.slice(0, 2), 16) +
      "," +
      parseInt(h.slice(2, 4), 16) +
      "," +
      parseInt(h.slice(4, 6), 16) +
      "," +
      a +
      ")"
    );
  }

  function drawOrb(p, alpha) {
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
    g.addColorStop(0, hexAlpha(p.color, alpha * 0.9));
    g.addColorStop(0.45, hexAlpha(p.color, alpha * 0.35));
    g.addColorStop(1, hexAlpha(p.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSpark(p, alpha) {
    ctx.fillStyle = hexAlpha(p.color, alpha * 0.85);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRing(p, alpha) {
    ctx.strokeStyle = hexAlpha(p.color, alpha * 0.55);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawWave(p, alpha) {
    ctx.strokeStyle = hexAlpha(p.color, alpha * 0.5);
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x - p.waveW, p.y + p.waveCurve * 3);
    ctx.quadraticCurveTo(p.x, p.y - p.waveCurve * 5, p.x + p.waveW, p.y + p.waveCurve * 3);
    ctx.stroke();
  }

  function drawConnections(fade) {
    var linkDist = isEmbeddedHome()
      ? window.innerWidth < 768
        ? 64
        : 88
      : window.innerWidth < 768
        ? 72
        : 96;
    var mx = mouse.x;
    var my = mouse.y;

    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var a = particles[i];
        var b = particles[j];
        var dist = Math.hypot(a.x - b.x, a.y - b.y);
        var maxD = linkDist * ((a.depth + b.depth) * 0.5);
        if (dist > maxD) continue;

        var t = 1 - dist / maxD;
        var alpha = t * t * (isEmbeddedHome() ? 0.22 : 0.16) * fade * ((a.depth + b.depth) * 0.45);

        if (mouse.active) {
          var md = Math.hypot((a.x + b.x) * 0.5 - mx, (a.y + b.y) * 0.5 - my);
          if (md < 140) alpha *= 1 + (1 - md / 140) * 1.8;
        }

        if (alpha < 0.008) continue;

        ctx.strokeStyle = "rgba(37, 99, 235, " + alpha + ")";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  function drawMouseGlow(fade) {
    if (!mouse.active || fade < 0.08) return;
    var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
    g.addColorStop(0, "rgba(108, 166, 255, " + 0.08 * fade + ")");
    g.addColorStop(0.55, "rgba(37, 99, 235, " + 0.035 * fade + ")");
    g.addColorStop(1, "rgba(37, 99, 235, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticle(p, fade) {
    var alpha = p.opacity * fade;
    if (alpha < 0.01) return;
    if (p.type === "orb") drawOrb(p, alpha);
    else if (p.type === "spark") drawSpark(p, alpha);
    else if (p.type === "ring") drawRing(p, alpha);
    else drawWave(p, alpha);
  }

  function tick(now) {
    rafId = window.requestAnimationFrame(tick);
    time = now || 0;
    mouse.x = lerp(mouse.x, mouse.tx, 0.07);
    mouse.y = lerp(mouse.y, mouse.ty, 0.07);

    var fade = scrollFade();
    if (fade <= 0.01) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    ctx.clearRect(0, 0, width, height);
    particles.forEach(updateParticle);
    drawMouseGlow(fade);
    drawConnections(fade);
    particles.forEach(function (p) {
      drawParticle(p, fade);
    });
  }

  function bindResizeObserver() {
    if (!isEmbeddedHome()) return;
    var banner = canvas.parentElement;

    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(function () {
        resize();
      });
      resizeObserver.observe(banner);
    }

    banner.querySelectorAll("img").forEach(function (img) {
      if (img.complete) return;
      img.addEventListener("load", resize, { once: true });
    });
  }

  window.addEventListener("resize", resize);
  window.addEventListener(
    "scroll",
    function () {
      scrollY = window.scrollY || window.pageYOffset || 0;
    },
    { passive: true }
  );
  window.addEventListener(
    "mousemove",
    function (e) {
      setPointer(e.clientX, e.clientY);
    },
    { passive: true }
  );
  window.addEventListener("mouseleave", function () {
    mouse.active = false;
  });
  window.addEventListener(
    "touchmove",
    function (e) {
      if (e.touches && e.touches[0]) {
        setPointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: true }
  );
  window.addEventListener("touchend", function () {
    mouse.active = false;
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (!rafId) {
      tick(performance.now());
    }
  });

  bindResizeObserver();
  resize();
  scrollY = window.scrollY || 0;

  function startLoop() {
    window.requestAnimationFrame(function () {
      resize();
      tick(performance.now());
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(startLoop).catch(startLoop);
  } else {
    startLoop();
  }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
