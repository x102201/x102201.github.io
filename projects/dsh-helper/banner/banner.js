/**
 * Banner work scenes: hover/click to switch, autoplay when idle.
 * Product beats (isolate / collaborate / sell) stay as copy tags, not scene names.
 */
(function () {
  var root = document.querySelector(".banner-dsh-helper");
  if (!root) return;

  var scenes = root.querySelectorAll(".banner-dsh-helper__scene");
  var tabs = root.querySelectorAll(".banner-dsh-helper__switch [data-scene]");
  var line = root.querySelector(".banner-dsh-helper__caption-line");
  var legend = root.querySelector(".banner-dsh-helper__legend");
  if (scenes.length < 2 || tabs.length !== scenes.length) return;

  var index = 0;
  var timer = 0;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  if (legend) {
    legend.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
    });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("mouseenter", function () {
      show(i);
    });
    tab.addEventListener("click", function () {
      show(i);
    });
  });

  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);

  show(0);
  start();
})();
