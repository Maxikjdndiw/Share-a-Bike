/* Shows the right message on confirmed.html, based on ?status=... from the backend */
(function () {
  var status = new URLSearchParams(location.search).get("status") || "ok";
  var texts = {
    already: ["Already confirmed.", "You're on the list. No need to confirm twice."],
    invalid: ["This link doesn't work.", "It may be expired or already used. Just sign up again on the homepage, it takes ten seconds."]
  };
  if (!texts[status]) return;
  document.querySelector("[data-title]").textContent = texts[status][0];
  document.querySelector("[data-text]").textContent = texts[status][1];
  if (status === "invalid") document.querySelector("[data-icon]").style.background = "#8E8E93";
})();
