// lib/email.ts
import { Resend } from "resend";

console.log("RESEND?", process.env.RESEND_API_KEY ? "OK" : "MISSING", "FROM:", process.env.MAIL_FROM);


const key = process.env.RESEND_API_KEY;
if (!key) console.warn("RESEND_API_KEY saknas – e-post kommer att misslyckas.");

export const resend = new Resend(key);

/** Skickar e-post (Resend). Bilagor skicka som Buffers. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const { to, subject, html, attachments } = opts;

  // För snabbtest kan du använda "onboarding@resend.dev" som avsändare
  const from = process.env.MAIL_FROM || "Offert MVP <onboarding@resend.dev>";

  return resend.emails.send({
    from,
    to,
    subject,
    html,
    attachments:
      attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64"),
      })) ?? [],
  });
}
