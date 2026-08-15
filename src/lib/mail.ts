/**
 * Transactional email.
 *
 * Uses Resend over plain HTTP when RESEND_API_KEY is present — no SDK, so
 * nothing extra ships to the serverless bundle. With no provider configured the
 * message is logged server-side and the caller is told delivery is unavailable,
 * rather than silently pretending an email was sent.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type MailResult = { delivered: boolean; reason?: string };

export function isMailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailResult> {
  if (!isMailConfigured()) {
    console.info(
      `[mail] not configured — would have sent "${input.subject}" to ${input.to}\n${input.text}`,
    );
    return { delivered: false, reason: "not_configured" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[mail] provider rejected the message", response.status, detail.slice(0, 300));
      return { delivered: false, reason: "provider_error" };
    }

    return { delivered: true };
  } catch (error) {
    console.error("[mail] send failed", error);
    return { delivered: false, reason: "network_error" };
  }
}

/* ------------------------------------------------------------------ design */

/*
 * The email shell.
 *
 * Mirrors the app's surfaces — near-black canvas, a bordered #0a0a0a card,
 * the same ink ramp — but written the way email actually renders: nested
 * tables rather than flexbox, every style inline because most clients strip
 * <style>, and a system font stack because Geist cannot be loaded here.
 *
 * `preheader` is the grey line clients show next to the subject in the inbox
 * list. Left unset they scrape the first words of the body, which usually
 * reads as a fragment.
 */
const INK = "#fafafa";
const INK_MUTED = "#a1a1aa";
const INK_DIM = "#8b8b93";
const CANVAS = "#000000";
const SURFACE = "#0a0a0a";
const BORDER = "#27272a";
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailShell(input: { title: string; preheader: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${CANVAS};">
  <!-- Inbox preview line, hidden in the message itself. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CANVAS};">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td style="padding-bottom:24px;">
              <span style="font-family:${FONT};font-size:15px;font-weight:600;letter-spacing:0.24em;color:${INK};">ORION</span>
            </td>
          </tr>

          <tr>
            <td style="background-color:${SURFACE};border:1px solid ${BORDER};border-radius:14px;padding:36px 32px;">
              ${input.body}
            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;font-family:${FONT};font-size:12px;line-height:1.6;color:${INK_DIM};">
              Orion — build a website, download the files, host them anywhere.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** A pill button that survives Outlook, which ignores padding on anchors. */
function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" bgcolor="${INK}" style="border-radius:999px;">
        <a href="${escapeHtml(href)}"
           style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:14px;font-weight:600;color:#0a0a0a;text-decoration:none;border-radius:999px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

const H1 = `margin:0 0 12px;font-family:${FONT};font-size:22px;font-weight:600;letter-spacing:-0.02em;color:${INK};`;
const P = `margin:0;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK_MUTED};`;
const NOTE = `margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${INK_DIM};`;
const RULE = `border-top:1px solid ${BORDER};font-size:0;line-height:0;height:1px;`;

/* ----------------------------------------------------------------- messages */

export function verificationEmail(code: string, name: string | null) {
  const greeting = name ? `Hi ${name},` : "Hi,";

  const text = `${greeting}

Your Orion verification code is:

    ${code.split("").join(" ")}

Enter it on the site to finish creating your account. The code expires in 10 minutes.

If you didn't try to create an account, you can ignore this email.`;

  const html = emailShell({
    title: "Confirm your email",
    preheader: `${code} is your Orion verification code. It expires in 10 minutes.`,
    body: `
      <h1 style="${H1}">Confirm your email</h1>
      <p style="${P}">${escapeHtml(greeting)} enter this code to finish creating your account.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
        <tr>
          <td align="center" style="background-color:#131316;border:1px solid ${BORDER};border-radius:12px;padding:26px 16px;">
            <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;font-weight:600;letter-spacing:10px;color:${INK};">${escapeHtml(code)}</span>
          </td>
        </tr>
      </table>

      <p style="${NOTE}">The code expires in 10 minutes and can only be used once.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
        <tr><td style="${RULE}">&nbsp;</td></tr>
      </table>

      <p style="${NOTE}margin-top:20px;">
        If you didn't try to create an Orion account, you can ignore this email — nothing was created.
      </p>`,
  });

  return { subject: `${code} is your Orion verification code`, html, text };
}

export function passwordResetEmail(resetUrl: string) {
  const text = `Reset your Orion password

Someone asked to reset the password for this account. If it was you, open the link below within one hour:

${resetUrl}

If it wasn't you, ignore this email — nothing has changed.`;

  const html = emailShell({
    title: "Reset your password",
    preheader: "Choose a new Orion password. This link works for one hour.",
    body: `
      <h1 style="${H1}">Reset your password</h1>
      <p style="${P}">
        Someone asked to reset the password on this Orion account. If that was you, choose a new
        one — the link works for one hour.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
        <tr><td>${emailButton(resetUrl, "Choose a new password")}</td></tr>
      </table>

      <p style="${NOTE}">
        Or paste this into your browser:<br>
        <span style="color:${INK_MUTED};word-break:break-all;">${escapeHtml(resetUrl)}</span>
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
        <tr><td style="${RULE}">&nbsp;</td></tr>
      </table>

      <p style="${NOTE}margin-top:20px;">
        If it wasn't you, ignore this email — your password has not changed.
      </p>`,
  });

  return { subject: "Reset your Orion password", html, text };
}
