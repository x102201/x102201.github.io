(function () {
  var STORAGE_KEY = "lang";

  function normalizePath(pathname) {
    return (pathname || "/").replace(/\\/g, "/");
  }

  function getStoredLang() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      return value === "en" || value === "zh" ? value : null;
    } catch (e) {
      return null;
    }
  }

  function setStoredLang(lang) {
    if (lang !== "en" && lang !== "zh") return;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* ignore */
    }
  }

  /** PRD: no preference → navigator.languages / navigator.language; zh* → zh, else en */
  function detectBrowserLang() {
    var list = [];
    if (typeof navigator !== "undefined") {
      if (navigator.languages && navigator.languages.length) {
        list = Array.prototype.slice.call(navigator.languages);
      } else if (navigator.language) {
        list = [navigator.language];
      }
    }
    for (var i = 0; i < list.length; i++) {
      if (/^zh/i.test(String(list[i]))) {
        return "zh";
      }
    }
    return "en";
  }

  /** PRD priority: stored preference > browser language > default en */
  function getEffectiveLang() {
    var stored = getStoredLang();
    if (stored) return stored;
    return detectBrowserLang();
  }

  function getPageLang(path) {
    if (/\/detail\/zh(?:\/|$)/.test(path)) return "zh";
    if (/\/zh(?:\/|$)/.test(path)) return "zh";
    return "en";
  }

  /**
   * Detect EN/ZH home URLs. Supports user pages (/ , /zh/) and project pages (/repo/ , /repo/zh/).
   * Returns null when not a home page.
   */
  function resolveHomeRoots(pathname) {
    var path = normalizePath(pathname);
    var stripped = path.replace(/\/index\.html$/i, "");
    if (stripped === "") stripped = "/";

    var parts = stripped.split("/").filter(Boolean);

    if (parts.length >= 1 && parts[parts.length - 1] === "zh") {
      var enParts = parts.slice(0, -1);
      var enRoot = enParts.length ? "/" + enParts.join("/") + "/" : "/";
      var zhRoot = enRoot === "/" ? "/zh/" : enRoot + "zh/";
      return { type: "zh", enRoot: enRoot, zhRoot: zhRoot };
    }

    var isEnHome =
      stripped === "/" ||
      (parts.length === 1 && /^index\.html$/i.test(parts[0])) ||
      (parts.length === 1 && !/\./.test(parts[0])) ||
      (parts.length === 2 && /^index\.html$/i.test(parts[1]));

    if (!isEnHome) return null;

    if (parts.length === 0 || (parts.length === 1 && /^index\.html$/i.test(parts[0]))) {
      return { type: "en", enRoot: "/", zhRoot: "/zh/" };
    }

    if (parts.length === 1) {
      return {
        type: "en",
        enRoot: "/" + parts[0] + "/",
        zhRoot: "/" + parts[0] + "/zh/",
      };
    }

    if (parts.length === 2 && /^index\.html$/i.test(parts[1])) {
      return {
        type: "en",
        enRoot: "/" + parts[0] + "/",
        zhRoot: "/" + parts[0] + "/zh/",
      };
    }

    return null;
  }

  /**
   * Home only: redirect when effective language and current home mismatch.
   * Priority: preference > browser > default en.
   */
  function maybeRedirectHome() {
    var home = resolveHomeRoots(window.location.pathname);
    if (!home) return;

    var effective = getEffectiveLang();

    if (effective === "zh" && home.type === "en") {
      window.location.replace(home.zhRoot);
      return;
    }

    if (effective === "en" && home.type === "zh") {
      window.location.replace(home.enRoot);
    }
  }

  /**
   * Detail deep links: show URL language as-is; persist it to avoid later home bouncing.
   */
  function syncDetailPreference() {
    var path = normalizePath(window.location.pathname);
    if (!/\/detail\//.test(path)) return;
    setStoredLang(getPageLang(path));
  }

  function bindLangSwitch() {
    var links = document.querySelectorAll("[data-lang-switch]");
    links.forEach(function (link) {
      link.addEventListener("click", function () {
        var lang = link.getAttribute("data-lang-switch");
        if (lang === "en" || lang === "zh") {
          setStoredLang(lang);
        }
      });
    });
  }

  function init() {
    bindLangSwitch();
  }

  /* Redirect / preference sync do not need DOM — run immediately to reduce flash */
  syncDetailPreference();
  maybeRedirectHome();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SiteLang = {
    get: getStoredLang,
    set: setStoredLang,
    detectBrowser: detectBrowserLang,
    getEffective: getEffectiveLang,
  };
})();
