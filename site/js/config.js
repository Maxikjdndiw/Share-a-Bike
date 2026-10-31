/* ==========================================================================
   Share a Bike · site configuration
   Edit these values, no other code changes needed.
   ========================================================================== */
window.SITE_CONFIG = {
  /* URL of the Supabase Edge Function that stores sign ups (see README,
     "Connect the sign up form"). Leave empty for DEMO MODE: the form then
     shows the thank-you message but stores nothing. Example:
     endpoint: "https://abcdefghijkl.supabase.co/functions/v1/waitlist", */
  endpoint: "",

  /* Only these email domains may sign up (subdomains are allowed too, so
     "louisenlund.de" also accepts "name@mail.louisenlund.de").
     The backend checks this again, this is only for instant feedback. */
  schoolEmailDomains: ["louisenlund.de"],

  /* Example address shown in hints and error messages */
  emailExample: "name@mail.louisenlund.de",

  /* Waitlist goals shown next to the live counter */
  goals: { riders: 50, owners: 15 },

  /* The live numbers appear once this many people have confirmed.
     Below that the page shows the goal instead of a small number. */
  showCountFrom: 10,
};

/* Tells the CSS that JavaScript runs (enables scroll animations).
   This file is loaded without "defer" so the class is set before first paint. */
document.documentElement.classList.add("js");
