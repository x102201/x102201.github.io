(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isZh() {
    var lang = (document.documentElement.lang || "").toLowerCase();
    return lang.indexOf("zh") === 0;
  }

  function initReveal() {
    var staggerGroups = [
      { root: ".dsh-hero__inner", child: true, stagger: 0.07 },
      { sel: ".dsh-hero__shot", stagger: 0 },
      { sel: ".dsh-equation-band", stagger: 0 },
      { sel: ".dsh-section--center > .dsh-section__label", stagger: 0 },
      { sel: ".dsh-section--center > h2", stagger: 0.06 },
      { sel: ".dsh-section--center > .dsh-section__intro", stagger: 0.12 },
      { root: ".dsh-pillars", child: ".dsh-pillar", stagger: 0.1 },
      { sel: ".dsh-section--band .dsh-section__label", stagger: 0 },
      { sel: ".dsh-section--band .dsh-section__inner > h2", stagger: 0.06 },
      { sel: ".dsh-feature", stagger: 0.08 },
      { sel: ".dsh-section:not(.dsh-section--center):not(.dsh-section--band):not(.dsh-start):not(.dsh-close) > .dsh-section__label", stagger: 0 },
      { sel: ".dsh-section:not(.dsh-section--center):not(.dsh-section--band):not(.dsh-start):not(.dsh-close) > h2", stagger: 0.06 },
      { sel: ".dsh-section:not(.dsh-section--center):not(.dsh-section--band):not(.dsh-start):not(.dsh-close) > .dsh-section__intro", stagger: 0.1 },
      { root: ".dsh-split", child: ".dsh-media", stagger: 0.1 },
      { sel: ".dsh-section:not(.dsh-start) > .dsh-media", stagger: 0 },
      { root: ".dsh-steps", child: "li", stagger: 0.12 },
      { sel: ".dsh-start .dsh-section__label", stagger: 0 },
      { sel: ".dsh-start h2", stagger: 0.06 },
      { sel: ".dsh-start .dsh-section__intro", stagger: 0.1 },
      { sel: ".dsh-release-note", stagger: 0.14 },
      { sel: ".dsh-start .dsh-cta-row", stagger: 0.18 },
      { sel: ".dsh-close", stagger: 0 },
    ];

    var nodes = [];

    staggerGroups.forEach(function (group) {
      if (group.root && group.child) {
        var root = document.querySelector(group.root);
        if (!root) return;
        var childSel = typeof group.child === "string" ? group.child : ":scope > *";
        var children = root.querySelectorAll(childSel);
        children.forEach(function (el, i) {
          markReveal(el, (group.stagger || 0) * i);
          nodes.push(el);
        });
        return;
      }
      if (group.root) {
        var container = document.querySelector(group.root);
        if (!container) return;
        var items = container.querySelectorAll(group.child);
        items.forEach(function (el, i) {
          markReveal(el, (group.stagger || 0) * i);
          nodes.push(el);
        });
        return;
      }
      document.querySelectorAll(group.sel).forEach(function (el) {
        markReveal(el, group.stagger || 0);
        nodes.push(el);
      });
    });

    if (reduced) {
      nodes.forEach(function (el) {
        el.classList.add("is-inview");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-inview");
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    nodes.forEach(function (el) {
      observer.observe(el);
    });
  }

  function markReveal(el, delay) {
    el.classList.add("dsh-reveal");
    if (delay) {
      el.style.setProperty("--reveal-delay", delay + "s");
    }
  }

  function initCopy() {
    document.querySelectorAll("[data-copy-url]").forEach(function (btn) {
      var defaultHint = btn.querySelector(".dsh-release-note__hint");
      var hintText = defaultHint ? defaultHint.textContent : "";

      btn.addEventListener("click", function () {
        var url = btn.getAttribute("data-copy-url");
        if (!url) return;

        function onCopied() {
          btn.classList.add("is-copied");
          if (defaultHint) {
            defaultHint.textContent = isZh() ? "已复制" : "Copied";
          }
          window.setTimeout(function () {
            btn.classList.remove("is-copied");
            if (defaultHint) {
              defaultHint.textContent = hintText;
            }
          }, 1800);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(onCopied).catch(fallback);
        } else {
          fallback();
        }

        function fallback() {
          var ta = document.createElement("textarea");
          ta.value = url;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
            onCopied();
          } catch (e) {
            window.open(url, "_blank", "noopener,noreferrer");
          }
          document.body.removeChild(ta);
        }
      });
    });
  }

  function initSteps() {
    var items = document.querySelectorAll(".dsh-steps li");
    if (!items.length) return;

    items.forEach(function (item, i) {
      item.style.setProperty("--step-i", i + 1);
    });

    if (reduced) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-active");
          } else {
            entry.target.classList.remove("is-active");
          }
        });
      },
      { root: null, threshold: 0.6, rootMargin: "-20% 0px -20% 0px" }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  function init() {
    initReveal();
    initCopy();
    initSteps();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
