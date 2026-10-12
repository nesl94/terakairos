import { createClient } from "npm:@supabase/supabase-js@2";

const TOKEN_TTL_MINUTES = 60;
const MAX_PENDING_PER_HOUR = 3;

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  let secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const secretMap = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretMap) {
    try { secret = JSON.parse(secretMap).default || secret; } catch (_) {}
  }
  if (!url || !secret) throw new Error("Supabase server credentials are unavailable.");
  return createClient(url, secret, { auth: { persistSession: false } });
}

function allowedOrigin(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(v => v.trim()).filter(Boolean);
  if (!origin) return allowed[0] || "*";
  if (allowed.length === 0 || allowed.includes(origin)) return origin;
  return "null";
}

function cors(req: Request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req),
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8" }
  });
}

function clean(value: unknown, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) && email.length <= 254;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "your email address";
  const shown = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${shown}${"•".repeat(Math.max(3, Math.min(8, local.length - shown.length)))}@${domain}`;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest).map(b => b.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch] || ch));
}

async function sendEmail(payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend verification email failed", response.status, detail.slice(0, 400));
    throw new Error("Could not send verification email.");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { message: "Method not allowed." }, 405);
  if (allowedOrigin(req) === "null") return json(req, { message: "Origin not allowed." }, 403);

  try {
    const input = await req.json();

    // Honeypot: bots often fill hidden fields. Return a normal-looking success without sending anything.
    if (clean(input.website, 200)) {
      return json(req, { ok: true, maskedEmail: "your email address" });
    }

    const service = clean(input.service, 160);
    const email = clean(input.email, 254).toLowerCase();
    const country = clean(input.country, 160);
    const dob = clean(input.dob, 20);
    const message = clean(input.message, 5000);

    if (!service || !country || !dob || !message || !validEmail(email)) {
      return json(req, { message: "Please complete all required fields with a valid email address." }, 400);
    }

    const db = getAdminClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const rawIp = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown").split(",")[0].trim();
    const salt = Deno.env.get("RATE_LIMIT_SALT") || "tera-kairos";
    const fingerprint = await sha256(`${salt}:${rawIp}`);

    const [emailRate, ipRate] = await Promise.all([
      db.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "pending").eq("email_normalized", email).gte("created_at", since),
      db.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "pending").eq("request_fingerprint", fingerprint).gte("created_at", since)
    ]);

    if (emailRate.error || ipRate.error) throw emailRate.error || ipRate.error;
    if ((emailRate.count || 0) >= MAX_PENDING_PER_HOUR || (ipRate.count || 0) >= MAX_PENDING_PER_HOUR) {
      return json(req, { message: "Too many verification requests were sent recently. Please wait and try again later." }, 429);
    }

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = base64Url(tokenBytes);
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

    const { data: inserted, error: insertError } = await db.from("enquiries").insert({
      email,
      email_normalized: email,
      service,
      country,
      dob,
      message,
      token_hash: tokenHash,
      token_expires_at: expiresAt,
      request_fingerprint: fingerprint,
      verification_sent_at: new Date().toISOString()
    }).select("id").single();

    if (insertError) throw insertError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const verifyUrl = `${supabaseUrl}/functions/v1/verify-enquiry?token=${encodeURIComponent(token)}`;
    const from = Deno.env.get("RESEND_FROM") || "Tera Kairos <onboarding@resend.dev>";

    try {
      await sendEmail({
        from,
        to: [email],
        subject: "Confirm your Tera Kairos enquiry",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#082f66;line-height:1.6">
            <h2 style="margin-bottom:8px">Confirm your email address</h2>
            <p>Thanks for contacting Tera Kairos about <strong>${escapeHtml(service)}</strong>.</p>
            <p>Please confirm that this email address belongs to you. Your enquiry will not be delivered to Tera Kairos until you click the button below.</p>
            <p style="margin:28px 0"><a href="${verifyUrl}" style="display:inline-block;background:#082f66;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700">Confirm email &amp; send enquiry</a></p>
            <p>This link expires in ${TOKEN_TTL_MINUTES} minutes. If you did not submit this enquiry, you can ignore this email.</p>
          </div>`
      });
    } catch (sendError) {
      await db.from("enquiries").delete().eq("id", inserted.id);
      throw sendError;
    }

    return json(req, { ok: true, maskedEmail: maskEmail(email) });
  } catch (error) {
    console.error("submit-enquiry error", error?.message || error);
    return json(req, { message: "We could not send the verification email right now. Please try again shortly." }, 500);
  }
});
