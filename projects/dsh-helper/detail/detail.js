(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isZh() {
    var lang = (document.documentElement.lang || "").toLowerCase();
    return lang.indexOf("zh") === 0;
  }

  function initReveal() {
    var staggerGroups = [
      { root: ".dsh-hero__inner", child: true, stagger: 0.07 },
      { sel: ".dsh-hero__shot", stagger: 0.08 },
      { sel: ".dsh-chapter__head", stagger: 0 },
      { sel: ".dsh-chapter__promise", stagger: 0.05 },
      { sel: ".dsh-chapter__grid .dsh-chapter__copy", stagger: 0.06, dir: "left" },
      { sel: ".dsh-chapter__grid .dsh-media", stagger: 0.12, dir: "right" },
      { sel: ".dsh-chapter__grid .dsh-callout", stagger: 0.12, dir: "right" },
      { sel: ".dsh-chapter__copy--wide", stagger: 0 },
      { root: ".dsh-pits", child: "li", stagger: 0.1 },
      { sel: ".dsh-chapter .dsh-media--diagram", stagger: 0.04 },
      { sel: ".dsh-chapter .dsh-media:not(.dsh-media--diagram)", stagger: 0.08 },
      { sel: ".dsh-mid-cta", stagger: 0 },
      { sel: ".dsh-start .dsh-section__label", stagger: 0 },
      { sel: ".dsh-start h2", stagger: 0.06 },
      { sel: ".dsh-start .dsh-section__intro", stagger: 0.1 },
      { root: ".dsh-steps", child: "li", stagger: 0.12 },
      { sel: ".dsh-start__shot", stagger: 0.08 },
      { sel: ".dsh-release-note", stagger: 0.14 },
      { sel: ".dsh-start .dsh-cta-row", stagger: 0.18 },
      { sel: ".dsh-close__inner", stagger: 0 }
    ];

    var nodes = [];

    staggerGroups.forEach(function (group) {
      if (group.root && group.child) {
        var roots = document.querySelectorAll(group.root);
        roots.forEach(function (root) {
          var childSel = typeof group.child === "string" ? group.child : ":scope > *";
          var children = root.querySelectorAll(childSel);
          children.forEach(function (el, i) {
            markReveal(el, (group.stagger || 0) * i, group.dir);
            nodes.push(el);
          });
        });
        return;
      }
      document.querySelectorAll(group.sel).forEach(function (el) {
        markReveal(el, group.stagger || 0, group.dir);
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

  function markReveal(el, delay, dir) {
    if (el.classList.contains("dsh-reveal")) return;
    el.classList.add("dsh-reveal");
    if (dir === "left") el.classList.add("dsh-reveal--left");
    if (dir === "right") el.classList.add("dsh-reveal--right");
    if (delay) {
      el.style.setProperty("--reveal-delay", delay + "s");
    }
  }

  function initChapters() {
    var chapters = document.querySelectorAll(".dsh-chapter");
    if (!chapters.length) return;

    if (reduced) {
      chapters.forEach(function (chapter) {
        chapter.classList.add("is-inview");
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
      { root: null, threshold: 0.22 }
    );

    chapters.forEach(function (chapter) {
      observer.observe(chapter);
    });
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
      item.setAttribute("tabindex", "0");
      item.addEventListener("click", function () {
        items.forEach(function (el) {
          el.classList.toggle("is-active", el === item);
        });
      });
      item.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          item.click();
        }
      });
    });

    if (reduced) {
      items[0].classList.add("is-active");
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            items.forEach(function (el) {
              el.classList.toggle("is-active", el === entry.target);
            });
          }
        });
      },
      { root: null, threshold: 0.6, rootMargin: "-20% 0px -20% 0px" }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  function initScenes() {
    var root = document.querySelector(".dsh-hero__shot");
    if (!root) return;

    var scenes = root.querySelectorAll(".dsh-hero__scene");
    var tabs = root.querySelectorAll(".dsh-hero__switch [data-scene]");
    var line = root.querySelector(".dsh-hero__caption");
    if (scenes.length < 2 || tabs.length !== scenes.length) return;

    var index = 0;
    var timer = 0;

    function show(next) {
      if (next === index && scenes[index].classList.contains("is-on")) return;
      scenes[index].classList.remove("is-on");
      tabs[index].classList.remove("is-on");
      index = next;
      scenes[index].classList.add("is-on");
      tabs[index].classList.add("is-on");
      if (line) {
        line.textContent = tabs[index].getAttribute("data-copy") || "";
      }
    }

    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = 0;
      }
    }

    function start() {
      if (reduced) return;
      stop();
      timer = window.setInterval(function () {
        show((index + 1) % scenes.length);
      }, 5600);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("mouseenter", function () {
        show(i);
      });
      tab.addEventListener("click", function () {
        show(i);
      });
      tab.addEventListener("focus", function () {
        show(i);
      });
    });

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);

    show(0);
    start();
  }

  function initBeats() {
    var bar = document.querySelector(".dsh-beats");
    var links = document.querySelectorAll(".dsh-beats a[data-beat]");
    var chapters = document.querySelectorAll(".dsh-chapter[data-chapter]");
    if (!bar || !links.length || !chapters.length) return;

    var currentId = "";

    function setCurrent(id) {
      if (!id || id === currentId) return;
      currentId = id;
      links.forEach(function (link) {
        var on = link.getAttribute("data-beat") === id;
        link.classList.toggle("is-current", on);
        if (on) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }

    function update() {
      var spy = bar.getBoundingClientRect().bottom + 12;
      var active = chapters[0];
      for (var i = 0; i < chapters.length; i++) {
        if (chapters[i].getBoundingClientRect().top <= spy) {
          active = chapters[i];
        }
      }
      setCurrent(active.getAttribute("data-chapter"));
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        var id = link.getAttribute("data-beat");
        setCurrent(id);
      });
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  function init() {
    initReveal();
    initChapters();
    initCopy();
    initSteps();
    initScenes();
    initBeats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
