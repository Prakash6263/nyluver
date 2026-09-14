import nodemailer, { type Transporter } from "nodemailer";

// Verification codes are delivered by email (not SMS/WhatsApp).
//
// Two transports are supported; whichever is configured is used:
//   1. SMTP      -> SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (SMTP_SECURE optional)
//   2. HTTP API  -> EMAIL_API_URL, EMAIL_API_KEY  (Resend-compatible JSON)
// EMAIL_FROM sets the sender. When nothing is configured the code is only
// written to the server log, so staging keeps working before credentials exist.

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === "true" || SMTP_PORT === 465;

const API_URL = process.env.EMAIL_API_URL;
const API_KEY = process.env.EMAIL_API_KEY;
const FROM = process.env.EMAIL_FROM || "Nyluver <no-reply@nyluver.com>";

let transporter: Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

export function isApiConfigured(): boolean {
  return !!(API_URL && API_KEY);
}

export function isEmailConfigured(): boolean {
  return isSmtpConfigured() || isApiConfigured();
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn(`[Email] Not configured - "${subject}" for ${to} was not delivered`);
    return { success: false, error: "not_configured" };
  }

  try {
    if (isSmtpConfigured()) {
      const info = await getTransporter().sendMail({ from: FROM, to, subject, html, text });
      console.log(`[Email] Sent "${subject}" to ${to} (${info.messageId})`);
      return { success: true };
    }

    const response = await fetch(API_URL as string, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[Email ERROR] ${response.status}: ${detail}`);
      return { success: false, error: detail.slice(0, 200) };
    }

    console.log(`[Email] Sent "${subject}" to ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Email ERROR] ${error.message}`);
    return { success: false, error: error.message };
  }
}

const CODE_COPY: Record<string, { subject: string; lead: string }> = {
  register: {
    subject: "Your Nyluver verification code",
    lead: "Welcome to Nyluver. Use this code to confirm your account.",
  },
  password_reset: {
    subject: "Reset your Nyluver password",
    lead: "Use this code to reset your password.",
  },
  login: {
    subject: "Your Nyluver verification code",
    lead: "Use this code to sign in.",
  },
};

export async function sendVerificationCodeEmail(
  to: string,
  code: string,
  purpose: string,
): Promise<{ success: boolean }> {
  const copy = CODE_COPY[purpose] || CODE_COPY.login;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#2F4538;margin:0 0 8px">Nyluver</h2>
      <p style="color:#5B6B60;margin:0 0 24px">${copy.lead}</p>
      <div style="background:#F4F1EA;border-radius:12px;padding:20px;text-align:center">
        <span style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#2F4538">${code}</span>
      </div>
      <p style="color:#8A968C;font-size:13px;margin-top:24px">This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
    </div>`;

  const text = `${copy.lead}\n\nCode: ${code}\n\nThis code expires in 5 minutes.`;

  return sendEmail(to, copy.subject, html, text);
}

// Codes go out by email only. The code is always logged so the flow stays
// testable before real email credentials are configured.
export async function deliverVerificationCode(opts: {
  email: string;
  code: string;
  purpose: string;
}): Promise<{ email: boolean }> {
  console.log(`[VERIFY] ${opts.purpose} code for ${opts.email}: ${opts.code}`);

  if (!isEmailConfigured()) {
    return { email: false };
  }

  const sent = await sendVerificationCodeEmail(opts.email, opts.code, opts.purpose);
  return { email: sent.success };
}
