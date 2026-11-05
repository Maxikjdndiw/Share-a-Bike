// ============================================================================
// Share a Bike waitlist · Supabase Edge Function (Deno)
//
//   POST /waitlist              -> store sign up, send confirmation email
//   GET  /waitlist?token=...&json=1 -> confirm email (double opt-in), JSON { status }
//        (called by confirmed.html; without json=1 it redirects, for older links)
//   GET  /waitlist?stats=1      -> { total, riders, owners } (confirmed only)
//
// Secrets (set with `supabase secrets set NAME=value`, see README):
//   SITE_URL          e.g. https://your-site.netlify.app   (no trailing slash)
//   ALLOWED_DOMAINS   optional. "*" or not set = every email address may sign up;
//                     e.g. louisenlund.de to allow only those (comma separated)
//   BREVO_API_KEY     API key from brevo.com (free plan: 300 emails/day)
//   SENDER_EMAIL      a sender address you verified in Brevo
//   SENDER_NAME       e.g. Share a Bike
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
// "*" or empty = no restriction
const ALLOWED_DOMAINS = (Deno.env.get("ALLOWED_DOMAINS") ?? "*")
  .split(",").map((d) => d.trim().toLowerCase()).filter((d) => d && d !== "*");
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") ?? "";
const SENDER_NAME = Deno.env.get("SENDER_NAME") ?? "Share a Bike";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Only our own website may call this function from a browser.
function cors(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const allowed = origin === SITE_URL || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : SITE_URL,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors(req), ...extra },
  });
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isSchoolEmail(email: string) {
  if (!ALLOWED_DOMAINS.length) return true; // open to every email address
  const host = email.split("@")[1] ?? "";
  return ALLOWED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function sendConfirmation(email: string, name: string, token: string) {
  // The button links to our own website (same domain as the sender), not to supabase.co:
  // spam filters distrust links that point somewhere other than the sender.
  const link = `${SITE_URL}/confirmed.html?token=${token}`;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: SENDER_EMAIL, name: SENDER_NAME },
      to: [{ email, name }],
      subject: `Confirm your spot on the ${SENDER_NAME} waitlist`,
      textContent:
        `Hi ${name},\n\nplease confirm your email to join the ${SENDER_NAME} waitlist:\n${link}\n\n` +
        `If you did not sign up, just ignore this email. Unconfirmed sign ups are deleted after 7 days.\n\n` +
        `${SENDER_NAME} · bike sharing at Schule Louisenlund`,
      htmlContent: `
        <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;color:#0B0B0C">
          <p style="font-size:22px;font-weight:700;letter-spacing:-.02em;margin:0 0 16px">Almost there, ${esc(name)}.</p>
          <p style="color:#5F5F64;line-height:1.55;margin:0 0 28px">Confirm your email to secure your spot on the ${esc(SENDER_NAME)} waitlist and your 2 free reservations.</p>
          <a href="${link}" style="display:inline-block;background:#0B0B0C;color:#fff;text-decoration:none;font-weight:600;padding:14px 26px;border-radius:999px">Confirm my email</a>
          <p style="color:#8E8E93;font-size:13px;line-height:1.5;margin:28px 0 0">Didn't sign up? Just ignore this email. Unconfirmed sign ups are deleted after 7 days.<br>${esc(SENDER_NAME)} · bike sharing at Schule Louisenlund</p>
        </div>`,
    }),
  });
  if (!res.ok) throw new Error(`Brevo error ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const url = new URL(req.url);

  // ---- GET: counter ---------------------------------------------------------
  if (req.method === "GET" && url.searchParams.has("stats")) {
    const { data, error } = await db.rpc("waitlist_stats");
    if (error) return json(req, { error: "stats unavailable" }, 500);
    return json(req, data, 200, { "cache-control": "public, max-age=60" });
  }

  // ---- GET: confirmation link from the email --------------------------------
  if (req.method === "GET" && url.searchParams.has("token")) {
    const token = url.searchParams.get("token") ?? "";
    let status = "invalid";
    if (/^[0-9a-f-]{36}$/.test(token)) {
      const hash = await sha256(token);
      const { data: row } = await db.from("waitlist")
        .select("id, confirmed_at, created_at").eq("confirm_token_hash", hash).maybeSingle();
      if (row?.confirmed_at) status = "already";
      else if (row) {
        await db.from("waitlist").update({ confirmed_at: new Date().toISOString() }).eq("id", row.id);
        status = "ok";
      }
    }
    if (url.searchParams.get("json") === "1") return json(req, { status });
    return Response.redirect(`${SITE_URL}/confirmed.html?status=${status}`, 303);
  }

  // ---- POST: new sign up ------------------------------------------------------
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(req, { error: "Invalid request." }, 400); }

  // Honeypot filled in = bot. Pretend success, store nothing.
  if (typeof body.website === "string" && body.website.length > 0) return json(req, { ok: true });

  const name = String(body.name ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 120);
  const class_year = String(body.class_year ?? "").trim().slice(0, 20);
  const role = String(body.role ?? "");
  const bike_type = role === "ride" ? null : String(body.bike_type ?? "");
  // optional: a parent's email for riders under 18 (needs migration 0002_parent_email.sql)
  const parent_email = String(body.parent_email ?? "").trim().toLowerCase().slice(0, 120) || null;

  if (!name || !class_year) return json(req, { error: "Please fill in all fields." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(req, { error: "Please enter a valid email address." }, 400);
  if (!isSchoolEmail(email)) return json(req, { error: "Sign-ups are limited to certain email addresses. Please use your school email." }, 400);
  if (!["ride", "lend", "both"].includes(role)) return json(req, { error: "Please choose ride, lend or both." }, 400);
  if (parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent_email)) {
    return json(req, { error: "Please check the parent's email address." }, 400);
  }
  if (bike_type !== null && !["city", "trekking", "mountain", "road", "other"].includes(bike_type)) {
    return json(req, { error: "Please choose your bike type." }, 400);
  }
  if (body.age_ok !== true || body.privacy_ok !== true) {
    return json(req, { error: "Please accept both confirmations." }, 400);
  }

  const { data: existing } = await db.from("waitlist")
    .select("id, confirmed_at, confirmation_sent_at").eq("email", email).maybeSingle();

  // Already confirmed: answer the same as a new sign up (no account enumeration).
  if (existing?.confirmed_at) return json(req, { ok: true });

  // Don't re-send more than once every 2 minutes.
  if (existing?.confirmation_sent_at && Date.now() - Date.parse(existing.confirmation_sent_at) < 120_000) {
    return json(req, { ok: true });
  }

  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    name, email, class_year, role, bike_type, parent_email,
    age_confirmed: true,
    privacy_accepted_at: now,
    confirm_token_hash: await sha256(token),
    confirmation_sent_at: now,
  };

  const { error } = existing
    ? await db.from("waitlist").update(row).eq("id", existing.id)
    : await db.from("waitlist").insert(row);
  if (error) {
    console.error(error);
    return json(req, { error: "Could not save your sign up. Please try again." }, 500);
  }

  try {
    await sendConfirmation(email, name, token);
  } catch (e) {
    console.error(e);
    return json(req, { error: "We could not send the confirmation email. Please try again later." }, 502);
  }
  return json(req, { ok: true });
});
