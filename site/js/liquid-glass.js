/* ==========================================================================
   Liquid glass header
   --------------------------------------------------------------------------
   1. Feature detection: SVG filters inside backdrop-filter currently only
      render in Chromium browsers (Chrome, Edge, Opera, Brave, Samsung Internet
      on Android). Safari, Firefox and every iOS browser get the frosted-glass
      fallback that is already the default in the CSS.
   2. Displacement map: we draw a small image the exact size of the pill.
      Grey (128,128) = no distortion. Near the rounded edge, the red/green
      channels point inward, so the filter samples content from further inside
      and the backdrop looks bent like curved glass. The middle stays clear.
      It is rebuilt only when the pill changes size (cheap: one canvas draw).
   3. Nav lens: a small glass pill slides to the hovered link.
   No scroll listeners, nothing runs per frame.
   ========================================================================== */
(function () {
  "use strict";

  // Every element with data-glass gets the effect: the header pill and the hero offer badge.
  var glasses = Array.prototype.slice.call(document.querySelectorAll("[data-glass]"));
  var glass = document.querySelector(".site-header [data-glass]"); // the header (has the nav lens)
  if (!glasses.length) return;

  /* ---- 1. Feature detection ------------------------------------------- */
  function supportsSvgBackdrop() {
    if (!window.CSS || !CSS.supports) return false;
    if (!CSS.supports("backdrop-filter", "url(#liquid-glass)")) return false;
    if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return false;
    // Safari reports CSS.supports = true but renders nothing, so we also
    // require a Chromium engine (only Chromium exposes userAgentData).
    var uad = navigator.userAgentData;
    if (!uad || !uad.brands) return false;
    return uad.brands.some(function (b) { return /Chromium|Chrome|Edge|Opera|Brave/i.test(b.brand); });
  }

  /* ---- 2. Displacement map -------------------------------------------- */
  var mapImage = document.getElementById("liquid-glass-map");

  // Tweak these to change the look of the glass:
  var BEZEL = 0.32;   // width of the refracting rim, as a share of the element height
  var CURVE = 2.2;    // >1 = distortion concentrated right at the edge

  function buildMap(w, h, radius) {
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    var img = ctx.createImageData(w, h);
    var data = img.data;
    var r = Math.min(radius || h / 2, h / 2, w / 2); // corner radius
    var bezel = h * BEZEL;

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var px = x + 0.5, py = y + 0.5;
        // nearest point of the inner rectangle (the shape minus its corner radius)
        var cx = Math.min(Math.max(px, r), w - r);
        var cy = Math.min(Math.max(py, r), h - r);
        var vx = px - cx, vy = py - cy;
        var len = Math.sqrt(vx * vx + vy * vy);
        if (!len) { data[(y * w + x) * 4] = 128; data[(y * w + x) * 4 + 1] = 128; data[(y * w + x) * 4 + 2] = 128; data[(y * w + x) * 4 + 3] = 255; continue; } // deep inside: no bend
        var distToEdge = r - len;                         // 0 at the rim
        var t = Math.min(Math.max(1 - distToEdge / bezel, 0), 1);
        var m = Math.pow(t, CURVE);                       // 0 centre .. 1 rim
        var i = (y * w + x) * 4;
        data[i]     = 128 - 127 * (vx / len) * m;         // R: x offset (inward)
        data[i + 1] = 128 - 127 * (vy / len) * m;         // G: y offset (inward)
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
  }

  // The header uses the #liquid-glass filter from index.html. Every further glass element
  // gets its own copy of that filter, because the displacement map must match its size.
  var baseFilter = document.getElementById("liquid-glass");

  function setupGlass(el, index) {
    var filter = baseFilter, mapEl = mapImage;
    if (index > 0) {
      filter = baseFilter.cloneNode(true);
      filter.id = "liquid-glass-" + index;
      mapEl = filter.querySelector("feImage");
      mapEl.removeAttribute("id");
      baseFilter.parentNode.appendChild(filter);
      el.style.setProperty("-webkit-backdrop-filter", "url(#" + filter.id + ")");
      el.style.setProperty("backdrop-filter", "url(#" + filter.id + ")");
    }
    var disps = Array.prototype.slice.call(filter.querySelectorAll("feDisplacementMap"));
    var baseScales = disps.map(function (d) { return +d.getAttribute("scale"); });
    var lastW = 0, lastH = 0;

    function update() {
      var w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (!w || !h || (w === lastW && h === lastH)) return;
      lastW = w; lastH = h;
      var url = buildMap(w, h, parseFloat(getComputedStyle(el).borderTopLeftRadius));
      mapEl.setAttribute("width", w);
      mapEl.setAttribute("height", h);
      mapEl.setAttribute("href", url);
      mapEl.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", url);
      // smaller pills bend less: the 60px header is the reference
      var k = Math.min(1, h / 60);
      disps.forEach(function (d, i) { d.setAttribute("scale", (baseScales[i] * k).toFixed(1)); });
    }

    update();
    el.classList.add("glass--svg");
    if ("ResizeObserver" in window) {
      var pending = false;
      new ResizeObserver(function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; update(); });
      }).observe(el);
    }
  }

  if (mapImage && baseFilter && supportsSvgBackdrop()) {
    glasses.forEach(setupGlass);
    document.documentElement.classList.add("has-liquid-glass");
  }

  /* ---- 3. Nav lens ------------------------------------------------------- */
  if (!glass) return;
  var nav = glass.querySelector(".nav");
  var lens = nav && nav.querySelector(".nav__lens");
  if (!nav || !lens) return;

  function moveLens(link) {
    var first = !nav.classList.contains("is-hovering");
    if (first) lens.style.transition = "opacity .25s"; // appear in place, don't slide in from 0
    // links sit inside .nav__item wrappers, so add the wrapper's offset
    lens.style.setProperty("--x", (link.parentElement.offsetLeft + link.offsetLeft) + "px");
    lens.style.setProperty("--w", link.offsetWidth + "px");
    nav.classList.add("is-hovering");
    if (first) { void lens.offsetWidth; lens.style.transition = ""; }
  }
  Array.prototype.forEach.call(nav.querySelectorAll(".nav__link"), function (link) {
    link.addEventListener("pointerenter", function () { moveLens(link); });
    link.addEventListener("focus", function () { moveLens(link); });
    link.addEventListener("blur", function () { nav.classList.remove("is-hovering"); });
  });
  nav.addEventListener("pointerleave", function () { nav.classList.remove("is-hovering"); });
})();
