# Share a Bike · pre-launch waitlist website

One-page waitlist site for a peer-to-peer student bike sharing pilot at Schule Louisenlund (launch January 2027).
It's a plain static site: HTML, CSS and a little JavaScript, with no build step and no frameworks. Nothing loads from third parties: no Google, no CDNs, no cookies, no analytics.

```
share-a-bike/
├── site/                     ← this folder is the website (upload / deploy this)
│   ├── index.html            ← all texts and prices (sections marked "SECTION 1…11")
│   ├── impressum.html        ← placeholder legal notice  (fill in the [brackets])
│   ├── datenschutz.html      ← placeholder privacy notice (fill in the [brackets])
│   ├── confirmed.html        ← page shown after clicking the email confirmation link
│   ├── css/style.css         ← design tokens at the top (colours, fonts, radii)
│   ├── js/config.js          ← backend URL, allowed email domains, waitlist goals
│   ├── js/liquid-glass.js    ← header refraction effect + support detection
│   ├── js/main.js            ← animations, menu, form, live counter
│   ├── fonts/                ← Inter (self-hosted, SIL Open Font License)
│   └── img/                  ← favicon, iOS icon, Open Graph image
├── supabase/                 ← backend for the form (database + one Edge Function)
├── tools/                    ← template + script to regenerate the OG image
└── netlify.toml              ← hosting config + security headers
```

## 1. Preview locally

```bash
python3 -m http.server 8000 -d site
```

Open http://localhost:8000. Without a backend URL the form runs in **demo mode**: it shows the thank-you message but stores nothing.

## 2. Edit texts, prices and the name

- **Name:** "Share a Bike". To rename, search and replace it in every file in `site/`, `tools/og-image.html` and `supabase/functions/waitlist/index.ts`.
- **Logo:** `site/img/logo.svg` (original). The header uses an inline copy in `site/index.html`, the favicon is `site/img/favicon.svg`.
- **Texts and prices:** all in `site/index.html`. Search for `SECTION 5` to get to pricing, for example. Each card is one block, so you can copy or delete it.
- **Colours:** at the top of `site/css/style.css` (`--accent` is the one orange accent colour).
- **Waitlist goals** (50 riders, 15 owners) and **allowed email domains:** `site/js/config.js`.
- **Contact email:** search for `hello@example.com`.

## 3. Put it online (free)

**Netlify (recommended, it uses the security headers in `netlify.toml`)**
1. Push this repository to GitHub (already done if you're reading this there).
2. On netlify.com: *Add new site → Import an existing project → GitHub*, choose the repo.
3. Leave **Base directory** and the build command empty. The publish directory `site` comes from `netlify.toml`.
4. Deploy. You get a URL like `https://something.netlify.app` (you can rename it under *Site configuration*).

Quick alternative: drag the `site` folder onto https://app.netlify.com/drop.

**GitHub Pages** also works. Serve the `site/` folder, for example by copying it into a `docs/` folder and choosing *Settings → Pages → main / docs*. GitHub Pages ignores `netlify.toml`, so you don't get the extra security headers.

**After the first deploy:** replace `https://your-site.netlify.app` in the `og:url` and `og:image` tags at the top of `site/index.html` with your real URL. WhatsApp needs absolute URLs to show the preview image.

## 4. Connect the sign up form (Supabase + double opt-in)

Why Supabase: it's free, EU-hosted (Frankfurt), you can export the list as CSV, and it can run the small function that sends the confirmation email. Formspree and Google Forms can't do a real double opt-in for the *person signing up*, and Google Forms sends data to Google.

How it works:
`form → Edge Function (checks the data, stores it unconfirmed) → Brevo sends an email with a link → click → function marks the row confirmed → redirect to confirmed.html`.
The live counter only counts **confirmed** sign ups.

### Step 1: Create the database
1. Create a free account at https://supabase.com, then **New project**. Choose region **Central EU (Frankfurt)** and save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste the whole content of `supabase/migrations/0001_waitlist.sql`, then click **Run**.
3. Optional (recommended): under **Database → Extensions**, enable `pg_cron`, then run the two commented lines at the bottom of the SQL file. Unconfirmed sign ups are then deleted automatically after 7 days, as the privacy notice says.

### Step 2: Set up the confirmation email (Brevo, free, EU)
1. Create a free account at https://www.brevo.com (300 emails/day).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: add the address the emails should come from (e.g. your project Gmail or school address) and confirm it via the email Brevo sends you.
   Better deliverability: if you own a domain, verify the domain instead.
3. **SMTP & API → API Keys → Generate a new API key**. Copy it.

### Step 3: Deploy the Edge Function
Install the Supabase CLI (https://supabase.com/docs/guides/cli). On a Mac: `brew install supabase/tap/supabase`. On any system with Node: `npx supabase …`. Then, from the repository folder:

```bash
supabase login
```

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

(The project ref is the part before `.supabase.co` in your project URL, shown under *Project Settings → General*.)

```bash
supabase secrets set SITE_URL=https://your-site.netlify.app ALLOWED_DOMAINS=* BREVO_API_KEY=xkeysib-... SENDER_EMAIL=you@example.com SENDER_NAME="Share a Bike"
```

```bash
supabase functions deploy waitlist --no-verify-jwt
```

`--no-verify-jwt` lets the public website call the function without a login. The function validates everything itself and never exposes the table.

### Step 4: Point the website at it
In `site/js/config.js` set:

```js
endpoint: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/waitlist",
```

Commit and push (Netlify redeploys automatically). Then sign up yourself with a school address, click the link in the email, and watch the counter go up.

If something fails: Supabase dashboard → **Edge Functions → waitlist → Logs**.

### Step 5: Export the list
- **Table Editor → waitlist → Export → CSV** (all rows, including unconfirmed ones), or
- **SQL Editor:** `select * from waitlist_export;`, then **Download CSV** (confirmed sign ups only, the useful list).

## 5. GDPR / privacy checklist

- ✅ No cookies, no tracking, no Google Analytics, no Google Fonts, no external scripts (enforced by the Content-Security-Policy in `netlify.toml`).
- ✅ Font is self-hosted in `site/fonts`.
- ✅ Minimal data: first name, email, class, role, bike type (owners only), consent timestamps. No IP addresses are stored.
- ✅ Double opt-in. Confirmation tokens are stored only as hashes. Unconfirmed rows are deleted after 7 days (pg_cron, step 1.3).
- ✅ Database not readable with public keys (Row Level Security, no policies).
- ⚠️ Fill in `impressum.html` and `datenschutz.html` and have a teacher or the school check them. Sign the data processing agreements (DPA / AVV) with Supabase and Brevo (both offer them in their dashboards).
- **If you want visitor numbers:** use a cookie-free tool such as Netlify's server-side analytics (no script at all), or GoatCounter / Plausible (EU). Scripts need a CSP update and a line in the privacy notice. The site works without any of these.

## 6. The liquid glass header

- **Chromium browsers** (Chrome, Edge, Brave, Opera, Android): real refraction. `js/liquid-glass.js` draws a displacement map exactly the size of the pill. It is neutral in the middle and pushes inward near the rounded edges. The SVG filter `#liquid-glass` in `index.html` applies it through `backdrop-filter: url(#liquid-glass)` with a light blur, a saturation boost and a slight red/blue split (each colour channel is displaced a little differently).
- **Safari, Firefox, all iOS browsers:** they don't render SVG filters in `backdrop-filter` yet, so they keep the default frosted-glass style (blur, saturation, highlight rim, shadow). Detection is automatic: the script only switches on the real effect when the browser is Chromium *and* reports support.
- **Users with "Reduce transparency" turned on** get a solid header.
- **Tuning:** `BEZEL` and `CURVE` in `js/liquid-glass.js` (rim width and falloff), and the three `scale` values in the filter in `index.html` (refraction strength and colour split).
- **Performance:** the map is rebuilt only when the header changes size. There are no scroll listeners.

## 7. Open Graph image

`site/img/og-image.png` (1200×630) is rendered from `tools/og-image.html`. After changing the name or text:

```bash
node tools/render-images.mjs
```

This needs Node and Playwright (`npm i -D playwright && npx playwright install chromium`). It also regenerates `apple-touch-icon.png`. To test the preview, paste your URL into WhatsApp, or use https://www.opengraph.xyz.

## 8. Before you print the QR code

- [ ] `og:url` / `og:image` point to the real domain
- [ ] Backend connected and tested end to end (sign up → email → confirm → counter)
- [ ] Impressum and Datenschutz filled in and checked by the school
- [ ] Contact email replaced
- [ ] QR code points to the final URL (add `?ref=poster` if you want to tell sources apart later)
