/* nthara.com — progressive enhancements. The page is fully usable without this file. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Theme ---------- */
  var themeBtn = document.getElementById("theme-toggle");
  function syncThemeButton() {
    var isLight = root.getAttribute("data-theme") === "light";
    themeBtn.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
    var meta = document.querySelectorAll('meta[name="theme-color"]');
    meta.forEach(function (m) { m.setAttribute("content", isLight ? "#F5F7FB" : "#0A1020"); });
  }
  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncThemeButton();
    if (mesh) mesh.refreshColors();
  });
  syncThemeButton();

  /* ---------- Header + mobile menu ---------- */
  var header = document.querySelector(".site-header");
  var menuBtn = document.getElementById("menu-btn");
  var navLinks = document.getElementById("nav-links");

  function setMenu(open) {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navLinks.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
  }
  menuBtn.addEventListener("click", function () {
    setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
  });
  navLinks.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && navLinks.classList.contains("is-open")) {
      setMenu(false);
      menuBtn.focus();
    }
  });
  window.matchMedia("(min-width: 961px)").addEventListener("change", function (mq) {
    if (mq.matches) setMenu(false);
  });

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Scroll spy ---------- */
  var links = Array.prototype.slice.call(navLinks.querySelectorAll('a[href^="#"]:not(.btn)'));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("is-active"); a.removeAttribute("aria-current"); });
        var link = byId[entry.target.id];
        if (link) { link.classList.add("is-active"); link.setAttribute("aria-current", "true"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { spy.observe(s); });

    /* ---------- Reveal on scroll ---------- */
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          reveal.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(function (el, i) {
      el.style.transitionDelay = (el.parentElement.children.length > 1 ? (Array.prototype.indexOf.call(el.parentElement.children, el) % 4) * 70 : 0) + "ms";
      reveal.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Copy email ---------- */
  var copyBtn = document.getElementById("copy-email");
  var copyStatus = document.getElementById("copy-status");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.getAttribute("data-email");
      var done = function () {
        copyStatus.textContent = "Email address copied";
        setTimeout(function () { copyStatus.textContent = ""; }, 2400);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(done, function () { copyStatus.textContent = email; });
      } else {
        copyStatus.textContent = email;
      }
    });
  }

  /* ---------- Year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Hero mesh: a quiet sensor network with a travelling pulse ---------- */
  var mesh = (function () {
    var canvas = document.getElementById("hero-mesh");
    if (!canvas || !canvas.getContext) return null;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, nodes = [], linkDist = 150, running = false, visible = true, raf = 0;
    var pointer = { x: -9999, y: -9999 };
    var pulse = { from: 0, to: 1, t: 0 };
    var lineRGB = "108,180,255", baseAlpha = 0.22, ember = "#f2b35e";

    function refreshColors() {
      var cs = getComputedStyle(root);
      lineRGB = cs.getPropertyValue("--mesh-line").trim() || lineRGB;
      baseAlpha = parseFloat(cs.getPropertyValue("--mesh-alpha")) || baseAlpha;
      ember = cs.getPropertyValue("--ember").trim() || ember;
      if (!running) draw();
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(70, Math.max(22, (w * h) / 22000)));
      linkDist = w < 700 ? 110 : 150;
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: Math.random() * 1.3 + 0.9
        });
      }
      pickPulse(Math.floor(Math.random() * nodes.length));
      draw();
    }

    function neighbours(i) {
      var out = [], a = nodes[i];
      for (var j = 0; j < nodes.length; j++) {
        if (j === i) continue;
        var dx = a.x - nodes[j].x, dy = a.y - nodes[j].y;
        if (dx * dx + dy * dy < linkDist * linkDist) out.push(j);
      }
      return out;
    }

    function pickPulse(from) {
      var n = neighbours(from);
      pulse.from = from;
      pulse.to = n.length ? n[Math.floor(Math.random() * n.length)] : Math.floor(Math.random() * nodes.length);
      pulse.t = 0;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var i, j, a, b, dx, dy, d2, max2 = linkDist * linkDist;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
          if (d2 < max2) {
            var near = Math.max(0, 1 - Math.hypot(pointer.x - (a.x + b.x) / 2, pointer.y - (a.y + b.y) / 2) / 220);
            ctx.strokeStyle = "rgba(" + lineRGB + "," + (baseAlpha * (1 - d2 / max2) + near * 0.25).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "rgba(" + lineRGB + "," + Math.min(1, baseAlpha * 3).toFixed(2) + ")";
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      // Pulse
      var p = nodes[pulse.from], q = nodes[pulse.to];
      if (p && q) {
        var e = pulse.t < 0.5 ? 2 * pulse.t * pulse.t : 1 - Math.pow(-2 * pulse.t + 2, 2) / 2;
        var px = p.x + (q.x - p.x) * e, py = p.y + (q.y - p.y) * e;
        var g = ctx.createRadialGradient(px, py, 0, px, py, 14);
        g.addColorStop(0, ember); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = ember;
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    function step() {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
      }
      pulse.t += 0.012;
      if (pulse.t >= 1) pickPulse(pulse.to);
      draw();
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (running || reduceMotion.matches || !visible || document.hidden) return;
      running = true; raf = requestAnimationFrame(step);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    var hero = document.getElementById("home");
    hero.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    });
    hero.addEventListener("pointerleave", function () { pointer.x = pointer.y = -9999; });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        visible ? start() : stop();
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    reduceMotion.addEventListener("change", function () { reduceMotion.matches ? (stop(), draw()) : start(); });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    refreshColors();
    resize();
    start();
    return { refreshColors: refreshColors };
  })();
})();
