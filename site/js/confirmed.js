/* ==========================================================================
   confirmed.html
   The email's "Confirm my email" button opens this page with ?token=...
   We send the token to the backend, then show the result. (Older links come
   with ?status=... from the backend's redirect and are shown directly.)
   ========================================================================== */
(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var token = params.get("token");
  var title = document.querySelector("[data-title]");
  var text = document.querySelector("[data-text]");
  var icon = document.querySelector("[data-icon]");
  var back = document.querySelector("[data-back]");

  var texts = {
    ok: ["You're on the list.", "Thanks for confirming. Your 2 free reservations are saved. We'll email you before the pilot starts in January 2027."],
    already: ["Already confirmed.", "You're on the list. No need to confirm twice."],
    invalid: ["This link doesn't work.", "It may be expired or already used. Just sign up again on the homepage, it takes ten seconds."],
    offline: ["We couldn't confirm you yet.", "We couldn't reach our server. Check your connection and reload this page."],
    pending: ["Confirming…", "One moment, we're confirming your email address."]
  };

  function show(status) {
    var t = texts[status] || texts.invalid;
    title.textContent = t[0];
    text.textContent = t[1];
    icon.style.opacity = status === "pending" ? ".35" : "1";
    icon.style.background = (status === "invalid" || status === "offline") ? "#8E8E93" : "";
    back.hidden = status === "pending";
  }

  if (!token) { show(params.get("status") || "ok"); return; }

  var endpoint = (window.SITE_CONFIG || {}).endpoint;
  if (!endpoint) { show("invalid"); return; }
  show("pending");
  fetch(endpoint + "?token=" + encodeURIComponent(token) + "&json=1")
    .then(function (res) { return res.json(); })
    .then(function (body) {
      show(body.status);
      // keep the token out of the address bar and browser history
      if (body.status !== "offline") history.replaceState(null, "", "confirmed.html?status=" + encodeURIComponent(body.status));
    })
    .catch(function () { show("offline"); });
})();
