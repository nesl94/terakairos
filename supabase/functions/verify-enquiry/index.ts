import { createClient } from "npm:@supabase/supabase-js@2";

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

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest).map(b => b.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: string | null) {
  return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch] || ch));
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
    console.error("Resend delivery failed", response.status, detail.slice(0, 400));
    throw new Error("Could not deliver enquiry email.");
  }
}

function siteUrl(status: string) {
  const base = (Deno.env.get("PUBLIC_SITE_URL") || "").trim();
  if (!base) throw new Error("PUBLIC_SITE_URL is not configured.");
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return new URL(`verification.html?status=${encodeURIComponent(status)}`, normalized).toString();
}

function redirect(status: string) {
  return new Response(null, { status: 302, headers: { "Location": siteUrl(status), "Cache-Control": "no-store" } });
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  try {
    const token = new URL(req.url).searchParams.get("token") || "";
    if (!token || token.length < 30) return redirect("invalid");

    const db = getAdminClient();
    const tokenHash = await sha256(token);
    const { data: enquiry, error } = await db.from("enquiries").select("*").eq("token_hash", tokenHash).maybeSingle();
    if (error) throw error;
    if (!enquiry) return redirect("invalid");
    if (enquiry.status === "delivered") return redirect("success");
    if (new Date(enquiry.token_expires_at).getTime() < Date.now()) return redirect("expired");
    if (!enquiry.email || !enquiry.service || !enquiry.message) return redirect("invalid");

    await db.from("enquiries").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", enquiry.id);

    const from = Deno.env.get("RESEND_FROM") || "Tera Kairos <onboarding@resend.dev>";
    const owner = Deno.env.get("OWNER_EMAIL") || "tera.kairos@yahoo.com";
    const dobText = enquiry.dob ? new Date(`${enquiry.dob}T00:00:00Z`).toISOString().slice(0, 10) : "";

    try {
      await sendEmail({
        from,
        to: [owner],
        reply_to: enquiry.email,
        subject: `Verified Tera Kairos enquiry — ${enquiry.service}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#082f66;line-height:1.6">
            <h2>New verified enquiry</h2>
            <p><strong>Email:</strong> ${escapeHtml(enquiry.email)}</p>
            <p><strong>Service:</strong> ${escapeHtml(enquiry.service)}</p>
            <p><strong>Country of origin:</strong> ${escapeHtml(enquiry.country)}</p>
            <p><strong>Date of birth:</strong> ${escapeHtml(dobText)}</p>
            <p><strong>Message:</strong></p>
            <div style="white-space:pre-wrap;background:#f5f9ff;border:1px solid #dce9f8;border-radius:14px;padding:16px">${escapeHtml(enquiry.message)}</div>
            <p style="font-size:13px;color:#60708a">The visitor verified ownership of the email address before this enquiry was delivered.</p>
          </div>`
      });

      // Optional confirmation back to the visitor.
      await sendEmail({
        from,
        to: [enquiry.email],
        subject: "Your Tera Kairos enquiry has been sent",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#082f66;line-height:1.6">
            <h2>Your email is verified</h2>
            <p>Thank you. Your enquiry about <strong>${escapeHtml(enquiry.service)}</strong> has now been sent to Tera Kairos.</p>
            <p>We’ll get in touch using this verified email address.</p>
          </div>`
      });

      // Minimise stored personal data after successful delivery while keeping an idempotent verification record.
      await db.from("enquiries").update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        email: null,
        email_normalized: null,
        service: null,
        country: null,
        dob: null,
        message: null
      }).eq("id", enquiry.id);

      return redirect("success");
    } catch (sendError) {
      console.error("owner delivery failed", sendError?.message || sendError);
      await db.from("enquiries").update({ status: "delivery_failed" }).eq("id", enquiry.id);
      return redirect("error");
    }
  } catch (error) {
    console.error("verify-enquiry error", error?.message || error);
    try { return redirect("error"); } catch (_) { return new Response("Verification failed.", { status: 500 }); }
  }
});
