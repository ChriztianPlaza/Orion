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

export function verificationEmail(code: string, name: string | null) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const spaced = code.split("").join(" ");

  const text = `${greeting}

Your Orion verification code is:

    ${spaced}

Enter it on the site to finish creating your account. The code expires in 10 minutes.

If you didn't try to create an account, you can ignore this email.`;

  const html = `<!doctype html>
<html><body style="margin:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px">
    <h1 style="font-size:20px;font-weight:600;letter-spacing:-0.02em;margin:0 0 16px">Confirm your email</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin:0 0 28px">
      ${greeting} enter this code on the site to finish creating your Orion account.
    </p>
    <div style="background:#111;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;text-align:center">
      <span style="font-size:34px;font-weight:600;letter-spacing:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${code}</span>
    </div>
    <p style="color:rgba(255,255,255,0.35);font-size:13px;line-height:1.6;margin:28px 0 0">
      The code expires in 10 minutes. If you didn't try to create an account, ignore this email.
    </p>
  </div>
</body></html>`;

  return { subject: `${code} is your Orion verification code`, html, text };
}

export function passwordResetEmail(resetUrl: string) {
  const text = `Reset your Orion password

Someone asked to reset the password for this account. If it was you, open the link below within one hour:

${resetUrl}

If it wasn't you, ignore this email — nothing has changed.`;

  const html = `<!doctype html>
<html><body style="margin:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px">
    <h1 style="font-size:20px;font-weight:600;letter-spacing:-0.02em;margin:0 0 16px">Reset your password</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin:0 0 24px">
      Someone asked to reset the password for this Orion account. If it was you, use the button
      below within one hour.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">Choose a new password</a>
    <p style="color:rgba(255,255,255,0.35);font-size:13px;line-height:1.6;margin:28px 0 0">
      If it wasn't you, ignore this email — nothing has changed.
    </p>
  </div>
</body></html>`;

  return { subject: "Reset your Orion password", html, text };
}
