/* ==========================================================================
   Fold-out menus in the header
   Hover a header link (or focus it with the keyboard) and a panel with links
   to specific points on the page folds out below it. A short close delay
   lets the pointer travel from the link into the panel. Escape closes.
   Only active where the desktop nav is visible; phones use the menu button.
   ========================================================================== */
(function () {
  "use strict";
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-nav-item]"));
  if (!items.length) return;
  var CLOSE_DELAY = 140; // ms
  var suppressFocusOpen = false; // set while Escape hands focus back to the link

  function setOpen(item, open) {
    item.classList.toggle("is-open", open);
    item.querySelector(".nav__link").setAttribute("aria-expanded", String(open));
  }
  function closeAll(except) {
    items.forEach(function (it) { if (it !== except) setOpen(it, false); });
  }

  items.forEach(function (item) {
    var timer = null;
    function open() { clearTimeout(timer); closeAll(item); setOpen(item, true); }
    function closeSoon() { clearTimeout(timer); timer = setTimeout(function () { setOpen(item, false); }, CLOSE_DELAY); }

    item.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse" || e.pointerType === "pen") open(); });
    item.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" || e.pointerType === "pen") closeSoon(); });
    item.addEventListener("focusin", function () { if (!suppressFocusOpen) open(); });
    item.addEventListener("focusout", function (e) { if (!item.contains(e.relatedTarget)) closeSoon(); });
    // choosing a point closes the panel
    item.querySelectorAll(".nav__sub").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(item, false); a.blur(); });
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var openItem = items.filter(function (it) { return it.classList.contains("is-open"); })[0];
    if (!openItem) return;
    setOpen(openItem, false);
    suppressFocusOpen = true;
    openItem.querySelector(".nav__link").focus();
    suppressFocusOpen = false;
  });
})();
