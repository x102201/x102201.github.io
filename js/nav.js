(function () {
  var NAV_SLOT = "[data-site-content-nav]";

  function normalizePath(pathname) {
    return (pathname || "/").replace(/\\/g, "/");
  }

  function pathDepth() {
    var path = normalizePath(window.location.pathname);
    var parts = path.split("/").filter(Boolean);
    if (parts.length && /\.html$/i.test(parts[parts.length - 1])) {
      parts.pop();
    }
    return parts.length;
  }

  function relativeToRoot(rootRelative) {
    var depth = pathDepth();
    var prefix = depth ? Array(depth + 1).join("../") : "./";
    return prefix + rootRelative;
  }

  function detectLang() {
    var path = normalizePath(window.location.pathname);
    if (/\/detail\/zh(?:\/|$)/.test(path)) return "zh";
    var parts = path.split("/").filter(Boolean);
    if (parts.length >= 1 && parts[parts.length - 1] === "zh") return "zh";
    if (parts.length >= 2 && parts[parts.length - 2] === "zh") return "zh";
    var docLang = (document.documentElement.lang || "").toLowerCase();
    if (docLang.indexOf("zh") === 0) return "zh";
    return "en";
  }

  function detectPageMode() {
    var path = normalizePath(window.location.pathname);
    if (/\/projects\/[^/]+\/detail(?:\/|$)/.test(path)) return "detail";
    if (isHomePath(path)) return "home";
    return null;
  }

  function isHomePath(path) {
    var stripped = path.replace(/\/index\.html$/i, "");
    if (stripped === "" || stripped === "/") return true;
    var parts = stripped.split("/").filter(Boolean);
    if (parts.length === 1 && parts[0] === "zh") return true;
    if (parts.length === 1 && /^index\.html$/i.test(parts[0])) return true;
    if (parts.length === 2 && parts[1] === "zh") return true;
    if (parts.length === 1 && !/\./.test(parts[0])) return true;
    if (parts.length === 2 && /^index\.html$/i.test(parts[1])) return true;
    return false;
  }

  function detectCurrentProjectId() {
    var path = normalizePath(window.location.pathname);
    var match = path.match(/\/projects\/([^/]+)\/detail(?:\/|$)/);
    return match ? match[1] : null;
  }

  function getProjects() {
    return window.SITE_PROJECTS || [];
  }

  function projectTitle(project, lang) {
    return lang === "zh" ? project.titleZh : project.titleEn;
  }

  function bannerAnchorId(projectId) {
    return "banner-" + projectId;
  }

  function buildNavList(slot, lang, mode, currentId) {
    var projects = getProjects();
    if (!projects.length) return;

    var list = document.createElement("ul");
    list.className = "site-content-nav";

    projects.forEach(function (project) {
      var li = document.createElement("li");
      var link = document.createElement("a");
      var title = projectTitle(project, lang);
      var isCurrent = project.id === currentId;

      link.textContent = title;
      link.title = title;
      link.setAttribute("data-project-id", project.id);

      if (mode === "home") {
        link.href = "#" + bannerAnchorId(project.id);
      } else {
        var detailPath =
          lang === "zh" ? project.detailPathZh : project.detailPathEn;
        link.href = relativeToRoot(detailPath);
        if (isCurrent) {
          link.setAttribute("aria-current", "page");
        }
      }

      if (isCurrent) {
        link.classList.add("is-active");
      }

      li.appendChild(link);
      list.appendChild(li);
    });

    slot.appendChild(list);
    maybeMarkNavOverflow(slot);
    return list;
  }

  function maybeMarkNavOverflow(slot) {
    if (!slot) return;
    function check() {
      slot.classList.toggle("is-overflowing", slot.scrollWidth > slot.clientWidth + 2);
    }
    check();
    window.addEventListener("resize", check, { passive: true });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(check);
      ro.observe(slot);
    }
  }

  function setActiveNavItem(list, projectId) {
    if (!list) return;
    var links = list.querySelectorAll("[data-project-id]");
    links.forEach(function (link) {
      var active = link.getAttribute("data-project-id") === projectId;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
        scrollNavItemIntoView(link);
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function scrollNavItemIntoView(link) {
    var nav = link.closest(".site-nav__content");
    if (!nav || !link) return;
    var linkRect = link.getBoundingClientRect();
    var navRect = nav.getBoundingClientRect();
    if (linkRect.left < navRect.left || linkRect.right > navRect.right) {
      link.scrollIntoView({ inline: "nearest", block: "nearest" });
    }
  }

  function initHomeNav(list, lang) {
    var projects = getProjects();
    var banners = projects
      .map(function (p) {
        return document.getElementById(bannerAnchorId(p.id));
      })
      .filter(Boolean);

    if (!banners.length) return;

    list.addEventListener("click", function (event) {
      var link = event.target.closest("[data-project-id]");
      if (!link || !list.contains(link)) return;
      event.preventDefault();
      var id = link.getAttribute("data-project-id");
      var target = document.getElementById(bannerAnchorId(id));
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", "#" + bannerAnchorId(id));
      setActiveNavItem(list, id);
    });

    var ratios = {};
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          ratios[entry.target.id] = entry.intersectionRatio;
        });
        var bestId = null;
        var bestRatio = 0;
        Object.keys(ratios).forEach(function (key) {
          if (ratios[key] > bestRatio) {
            bestRatio = ratios[key];
            bestId = key.replace(/^banner-/, "");
          }
        });
        if (bestId && bestRatio > 0) {
          setActiveNavItem(list, bestId);
        }
      },
      {
        root: null,
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
        rootMargin: "-" + getNavOffset() + "px 0px -45% 0px",
      }
    );

    banners.forEach(function (banner) {
      observer.observe(banner);
    });

    var hash = window.location.hash.replace(/^#/, "");
    if (hash.indexOf("banner-") === 0) {
      var fromHash = document.getElementById(hash);
      if (fromHash) {
        requestAnimationFrame(function () {
          fromHash.scrollIntoView({ block: "start" });
          setActiveNavItem(list, hash.replace(/^banner-/, ""));
        });
      }
    } else if (projects[0]) {
      setActiveNavItem(list, projects[0].id);
    }

    window.addEventListener("hashchange", function () {
      var h = window.location.hash.replace(/^#/, "");
      if (h.indexOf("banner-") !== 0) return;
      var el = document.getElementById(h);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveNavItem(list, h.replace(/^banner-/, ""));
      }
    });
  }

  function initDetailNav(list, currentId) {
    list.addEventListener("click", function (event) {
      var link = event.target.closest("[data-project-id]");
      if (!link || !list.contains(link)) return;
      if (link.getAttribute("data-project-id") === currentId) {
        event.preventDefault();
        link.classList.add("is-pressed");
        window.setTimeout(function () {
          link.classList.remove("is-pressed");
        }, 180);
      }
    });
  }

  function getNavOffset() {
    var nav = document.querySelector(".site-nav");
    return nav ? Math.ceil(nav.getBoundingClientRect().height) : 56;
  }

  function bindNavScroll() {
    var nav = document.querySelector(".site-nav");
    if (!nav) return;

    var ticking = false;
    var threshold = 48;

    function update() {
      var y = window.scrollY || 0;
      nav.classList.toggle("is-scrolled", y > threshold);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  function init() {
    bindNavScroll();

    var slot = document.querySelector(NAV_SLOT);
    if (!slot) return;

    var mode = detectPageMode();
    if (!mode) return;

    var lang = detectLang();
    slot.setAttribute(
      "aria-label",
      lang === "zh" ? "项目导航" : "Project navigation"
    );

    var currentId = mode === "detail" ? detectCurrentProjectId() : null;
    if (mode === "detail" && !currentId) return;

    var list = buildNavList(slot, lang, mode, currentId);
    if (!list) return;

    if (mode === "home") {
      initHomeNav(list, lang);
    } else {
      initDetailNav(list, currentId);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
