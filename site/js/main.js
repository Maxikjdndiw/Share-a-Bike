/* ==========================================================================
   Share a Bike · page behaviour
   1. Scroll reveal animations
   2. Mobile menu
   3. "I want to ride / lend" buttons preselect the form option
   4. Sign up form (validation, submit, thank-you state)
   5. Live waitlist counter
   6. Lunch break planner (problem section)
   ========================================================================== */
(function () {
  "use strict";

  var CONFIG = window.SITE_CONFIG || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Texts written by this script, in English and German. The page language
     (<html lang>) decides which set is used: index.html = en, de.html = de. */
  var LANG = (document.documentElement.lang || "en").slice(0, 2) === "de" ? "de" : "en";
  var T = {
    en: {
      openMenu: "Open menu", closeMenu: "Close menu",
      emailEmpty: "Please enter your email address.",
      emailInvalid: "That doesn't look like an email address. Example: ",
      emailDomain: "Please use your school email, like ",
      parentInvalid: "That doesn't look like an email address. Leave it empty if you are 18 or older.",
      name: "Please tell us your first name.",
      year: "Please choose your year group.",
      bike: "Please choose your bike type.",
      age: "Please confirm this to join.",
      privacy: "Please confirm you've read the privacy notice.",
      fix: function (n) { return "Please fix the " + n + " fields marked in red."; },
      sending: "Sending…", join: "Join the waitlist",
      failed: "Something went wrong. Please try again.",
      offline: "We could not reach the server. Please check your connection and try again.",
      atPaasch: " min</b> at Paasch", late: " min late</b> back to class",
      plans: { ppr: "Pay per ride", basic: "Basic", premium: "Premium" }, and: " and "
    },
    de: {
      openMenu: "Menü öffnen", closeMenu: "Menü schließen",
      emailEmpty: "Bitte gib deine E-Mail-Adresse ein.",
      emailInvalid: "Das sieht nicht wie eine E-Mail-Adresse aus. Beispiel: ",
      emailDomain: "Bitte nutze deine Schul-E-Mail, zum Beispiel ",
      parentInvalid: "Das sieht nicht wie eine E-Mail-Adresse aus. Lass das Feld leer, wenn du 18 oder älter bist.",
      name: "Bitte gib deinen Vornamen ein.",
      year: "Bitte wähle deinen Jahrgang.",
      bike: "Bitte wähle deinen Fahrradtyp.",
      age: "Bitte bestätige das, um mitzumachen.",
      privacy: "Bitte bestätige, dass du die Datenschutzerklärung gelesen hast.",
      fix: function (n) { return "Bitte korrigiere die " + n + " rot markierten Felder."; },
      sending: "Wird gesendet…", join: "Auf die Warteliste",
      failed: "Etwas ist schiefgelaufen. Bitte versuche es noch einmal.",
      offline: "Wir konnten den Server nicht erreichen. Bitte prüfe deine Verbindung und versuche es noch einmal.",
      atPaasch: " Min.</b> bei Paasch", late: " Min. zu spät</b> zurück im Unterricht",
      plans: { ppr: "Pay per Ride", basic: "Basic", premium: "Premium" }, and: " und "
    }
  }[LANG];

  var year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  /* ---- 1. Scroll reveal ------------------------------------------------- */
  var reveals = $$(".reveal");
  // small stagger for siblings that appear together (cards in a grid etc.)
  reveals.forEach(function (el) {
    var siblings = $$(":scope > .reveal", el.parentElement);
    var index = siblings.indexOf(el);
    if (index > 0) el.style.setProperty("--d", Math.min(index * 0.07, 0.35) + "s");
  });
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -4% 0px", threshold: 0 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- 2. Mobile menu --------------------------------------------------- */
  var toggle = $(".menu-toggle");
  var menu = $("#mobile-menu");
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? T.closeMenu : T.openMenu);
    menu.hidden = !open;
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () { setMenu(menu.hidden); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    document.addEventListener("click", function (e) {
      if (!menu.hidden && !menu.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
  }

  /* ---- 3. Preselect role from buttons ---------------------------------- */
  var form = $("#signup-form");
  var bikeField = $("#bike-type-field");
  var bikeSelect = $("#f-bike");

  function updateBikeField() {
    var role = form.elements.role.value;
    var needsBike = role === "lend" || role === "both";
    bikeField.hidden = !needsBike;
    bikeSelect.required = needsBike;
    if (!needsBike) { bikeSelect.value = ""; bikeSelect.removeAttribute("aria-invalid"); }
  }

  function selectRole(role) {
    var radio = $('input[name="role"][value="' + role + '"]', form);
    if (!radio) return;
    radio.checked = true;
    updateBikeField();
  }

  if (form) {
    $$("[data-role-select]").forEach(function (btn) {
      btn.addEventListener("click", function () { selectRole(btn.getAttribute("data-role-select")); });
    });
    $$('input[name="role"]', form).forEach(function (r) { r.addEventListener("change", updateBikeField); });
    updateBikeField();
  }

  /* ---- 4. Sign up form --------------------------------------------------
     Every problem is shown at once, directly under its field (and announced
     to screen readers). The email is also checked when you leave the field. */
  var summary = form && $(".form__error", form);
  var thanks = $("#signup-thanks");
  var EXAMPLE = CONFIG.emailExample || "name@example.com";

  function isSchoolEmail(email) {
    var domains = CONFIG.schoolEmailDomains || [];
    if (!domains.length) return true;
    var at = email.lastIndexOf("@");
    if (at < 1) return false;
    var host = email.slice(at + 1).toLowerCase();
    return domains.some(function (d) { d = d.toLowerCase(); return host === d || host.slice(-(d.length + 1)) === "." + d; });
  }

  function emailProblem(email) {
    if (!email) return T.emailEmpty;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return T.emailInvalid + EXAMPLE;
    if (!isSchoolEmail(email)) return T.emailDomain + EXAMPLE;
    return "";
  }

  // the message element that belongs to a control (<p class="field__error" data-error-for="name">)
  function errorEl(control) { return $('[data-error-for="' + control.name + '"]', form); }

  function setFieldError(control, msg) {
    var el = errorEl(control);
    if (msg) {
      control.setAttribute("aria-invalid", "true");
      if (el) { el.textContent = msg; el.hidden = false; }
    } else {
      control.removeAttribute("aria-invalid");
      if (el) { el.textContent = ""; el.hidden = true; }
    }
  }

  function showSummary(msg) {
    summary.textContent = msg;
    summary.hidden = !msg;
  }

  function validate() {
    var f = form.elements;
    var problems = [
      [f.name, f.name.value.trim() ? "" : T.name],
      [f.email, emailProblem(f.email.value.trim())],
      [f.class_year, f.class_year.value ? "" : T.year],
      [bikeSelect, bikeSelect.required && !bikeSelect.value ? T.bike : ""],
      [f.parent_email, !f.parent_email.value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.parent_email.value.trim()) ? "" : T.parentInvalid],
      [f.age_ok, f.age_ok.checked ? "" : T.age],
      [f.privacy_ok, f.privacy_ok.checked ? "" : T.privacy]
    ];
    var first = null, count = 0;
    problems.forEach(function (pr) {
      setFieldError(pr[0], pr[1]);
      if (pr[1]) { count++; if (!first) first = pr[0]; }
    });
    showSummary(count > 1 ? T.fix(count) : "");
    if (first) {
      first.focus({ preventScroll: true });
      first.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    }
    return count === 0;
  }

  function showThanks(email) {
    $("[data-thanks-email]", thanks).textContent = email;
    form.hidden = true;
    thanks.hidden = false;
    thanks.focus({ preventScroll: true });
    var top = thanks.getBoundingClientRect().top + window.scrollY - 140;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
  }

  if (form) {
    // clear a field's message as soon as the user starts fixing it
    form.addEventListener("input", function (e) { if (e.target.name) setFieldError(e.target, ""); });
    form.addEventListener("change", function (e) {
      if (e.target.type === "checkbox" || e.target.tagName === "SELECT") setFieldError(e.target, "");
    });
    // check the email when the user leaves the field (only if something was typed)
    form.elements.email.addEventListener("blur", function () {
      var v = this.value.trim();
      if (v) setFieldError(this, emailProblem(v));
    });

    // "Wrong email? Change it": back to the filled-in form, cursor in the email field
    var change = $("[data-change-email]", thanks);
    if (change) change.addEventListener("click", function () {
      thanks.hidden = true;
      form.hidden = false;
      form.elements.email.focus();
      form.elements.email.select();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;

      var f = form.elements;
      // Only what we really need is sent (data minimisation).
      var payload = {
        name: f.name.value.trim(),
        email: f.email.value.trim().toLowerCase(),
        class_year: f.class_year.value,
        parent_email: f.parent_email.value.trim().toLowerCase() || null,
        role: f.role.value,
        bike_type: bikeSelect.required ? bikeSelect.value : null,
        age_ok: f.age_ok.checked,
        privacy_ok: f.privacy_ok.checked,
        website: f.website.value // honeypot, must stay empty
      };

      var button = $('button[type="submit"]', form);
      var label = $(".btn__label", button);
      button.setAttribute("aria-busy", "true");
      label.textContent = T.sending;

      var request;
      if (!CONFIG.endpoint) {
        // DEMO MODE: no backend configured yet (see js/config.js)
        console.info("Share a Bike demo mode: sign up not stored. Set SITE_CONFIG.endpoint to connect the backend.", payload);
        request = new Promise(function (resolve) { setTimeout(resolve, 700); });
      } else {
        request = fetch(CONFIG.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (!res.ok || !body.ok) throw new Error(body.error || T.failed);
          });
        });
      }

      request.then(function () {
        showThanks(payload.email);
      }).catch(function (err) {
        var msg = err && err.message && !/fetch|network/i.test(err.message) ? err.message : T.offline;
        showSummary(msg);
      }).then(function () {
        button.removeAttribute("aria-busy");
        label.textContent = T.join;
      });
    });
  }

  /* ---- 5. Live counter -------------------------------------------------- */
  var counter = $("[data-counter]");
  var goals = CONFIG.goals || { riders: 50, owners: 15 };

  function animateNumber(el, to) {
    if (reduceMotion || to < 3) { el.textContent = to; return; }
    var start = null, dur = 800;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Confirmed sign-ups. The HTML starts at 0 for riders, owners and total,
  // so a failed request or missing JS still shows an intentional "0 / 50".
  function renderStats(stats) {
    ["total", "riders", "owners"].forEach(function (key) {
      var el = $('[data-count="' + key + '"]', counter);
      if (el) animateNumber(el, stats[key] || 0);
    });
    ["riders", "owners"].forEach(function (key) {
      var goalEl = $('[data-goal="' + key + '"]', counter);
      if (goalEl) goalEl.textContent = goals[key];
      var bar = $('[data-bar="' + key + '"]', counter);
      if (bar) bar.style.transform = "scaleX(" + Math.min(1, (stats[key] || 0) / goals[key]) + ")";
    });
  }

  function loadStats() {
    if (!counter) return;
    if (!CONFIG.endpoint) return; // demo mode: the zeros in the HTML stay
    fetch(CONFIG.endpoint + (CONFIG.endpoint.indexOf("?") > -1 ? "&" : "?") + "stats=1")
      .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
      .then(renderStats)
      .catch(function () { /* backend unreachable: the zeros in the HTML stay */ });
  }

  // load when the sign up section comes close, so the count-up is visible
  if (counter && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { cio.disconnect(); loadStats(); }
    }, { rootMargin: "200px" });
    cio.observe(counter);
  } else {
    loadStats();
  }
  /* ---- Hero rider ------------------------------------------------------
     After the route has drawn itself (~2 s), a small rider bikes it once from
     the school station to EDEKA Paasch. Skipped for reduced motion. */
  var rider = $("[data-rider]");
  var riderMotion = document.getElementById("riderMotion");
  if (rider && riderMotion && riderMotion.beginElement && !reduceMotion) {
    setTimeout(function () {
      rider.classList.add("is-riding");
      riderMotion.beginElement();
    }, 2100);
  }

  /* ---- Owner features (GPS tracker / smart lock) -------------------------
     Hovering a button unfolds its explanation; a click (or tap) keeps it open
     until clicked again. The matching spot on the bike lights up. */
  var features = $("[data-features]");
  if (features) {
    var pinned = null;
    var featureBtns = $$("[data-feature]", features);
    var showFeature = function (key) {
      featureBtns.forEach(function (btn) {
        var k = btn.getAttribute("data-feature"), on = k === key;
        btn.setAttribute("aria-expanded", String(on));
        $('[data-panel="' + k + '"]', features).classList.toggle("is-open", on);
        $('[data-spot="' + k + '"]', features).classList.toggle("is-active", on);
      });
    };
    featureBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = btn.getAttribute("data-feature");
        pinned = pinned === k ? null : k;
        showFeature(pinned);
      });
      btn.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") showFeature(btn.getAttribute("data-feature")); });
    });
    $(".features", features).addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") showFeature(pinned); });
  }

  /* ---- Cost slider ("Which plan is cheapest?") -------------------------
     Rides under 30 minutes, reservation fees not included:
     pay per ride 2 € per ride, Basic 5 € + 1 € per ride, Premium 12 € flat. */
  var costSlider = $("[data-cost-slider]");
  if (costSlider) {
    var COST = {
      ppr: function (n) { return 2 * n; },
      basic: function (n) { return 5 + 1 * n; },
      premium: function () { return 12; }
    };
    var ridesInput = $("#rides-n", costSlider);
    var updateCosts = function () {
      var n = parseInt(ridesInput.value, 10);
      $("[data-rides]", costSlider).textContent = n;
      var costs = {}, max = 0, min = Infinity;
      Object.keys(COST).forEach(function (k) { costs[k] = COST[k](n); max = Math.max(max, costs[k]); min = Math.min(min, costs[k]); });
      var best = [];
      Object.keys(COST).forEach(function (k) {
        var li = $('[data-plan="' + k + '"]', costSlider);
        $("[data-cost=" + k + "]", li).textContent = costs[k] + " €";
        li.querySelector(".cost-slider__track i").style.setProperty("--w", (costs[k] / max * 100) + "%");
        var isBest = costs[k] === min;
        li.classList.toggle("is-best", isBest);
        if (isBest) best.push(T.plans[k]);
      });
      $("[data-best]", costSlider).textContent = best.join(T.and);
    };
    ridesInput.addEventListener("input", updateCosts);
    costSlider.hidden = false;
    var costTable = $("[data-cost-table]");
    if (costTable) costTable.classList.add("is-replaced"); // the static table stays for no-JS visitors
    updateCosts();
  }

  /* ---- 6. Lunch break planner ------------------------------------------
     EDEKA Paasch is 1.5 km away. Minutes one way: about 18 on foot (5 km/h),
     about 5 by bike (17 km/h). Change these if you measure better values. */
  var planner = $("[data-planner]");
  var ONE_WAY = { walk: 18, bike: 5 };

  function updatePlanner() {
    var breakMin = parseInt($("#break-len", planner).value, 10);
    $("[data-break]", planner).textContent = breakMin;
    Object.keys(ONE_WAY).forEach(function (mode) {
      var travel = ONE_WAY[mode] * 2;
      var stay = breakMin - travel;
      var track = $('[data-track="' + mode + '"]', planner);
      var segs = $$(".seg", track);
      // when the trip takes longer than the break, the bar grows past it and the overrun shows in red
      track.style.setProperty("--total", Math.max(breakMin, travel));
      segs[1].style.setProperty("--m", Math.abs(stay));
      segs[1].classList.toggle("seg--late", stay < 0);
      segs[1].classList.toggle("seg--stay", stay >= 0);
      var result = $('[data-result="' + mode + '"]', planner);
      result.innerHTML = stay >= 0
        ? "<b>" + stay + T.atPaasch
        : "<b>" + -stay + T.late;
    });
  }
  if (planner) {
    $("#break-len", planner).addEventListener("input", updatePlanner);
    updatePlanner();
  }
})();
