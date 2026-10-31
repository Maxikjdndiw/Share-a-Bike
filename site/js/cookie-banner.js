/* ==========================================================================
   Cookie notice
   The site sets no cookies. The banner says so and offers Accept / Decline;
   both simply close it. The choice is remembered in localStorage (key below)
   so the banner doesn't come back. If storage is blocked, it shows again on
   the next visit, which is harmless.
   ========================================================================== */
(function () {
  "use strict";
  var banner = document.getElementById("cookie-banner");
  if (!banner) return;
  var KEY = "shareABike.cookieChoice";

  var choice = null;
  try { choice = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  if (choice) return;

  banner.hidden = false;
  banner.querySelectorAll("[data-cookie]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      try { localStorage.setItem(KEY, btn.getAttribute("data-cookie")); } catch (e) { /* storage blocked */ }
      banner.classList.add("is-leaving");
      setTimeout(function () { banner.hidden = true; }, 200);
    });
  });
})();
