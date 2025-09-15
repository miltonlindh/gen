// app/api/quotes/[id]/send/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { sendEmail } from "../../../../../lib/email";

async function launchBrowser() {
  try {
    const isCore = !!process.env.VERCEL || process.env.PUPPETEER_CORE === "1";
    if (isCore) {
      const chromium = (await import("@sparticuz/chromium")).default;
      const puppeteer = (await import("puppeteer-core")).default;
      return puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    }
  } catch (e) {
    console.warn("puppeteer-core/chromium not available, fallback to puppeteer", e);
  }
  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({ args: ["--no-sandbox"] });
}

const oreToSEK = (ore: number) =>
  (ore / 100).toLocaleString("sv-SE", { style: "currency", currency: "SEK" });

function htmlFor(q: any) {
  const rows = q.items.map((it: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${it.title}</td>
      <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">${it.quantity}</td>
      <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">${oreToSEK(it.unitPrice)}</td>
      <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">${oreToSEK(it.lineTotal)}</td>
    </tr>`).join("");

  return `<!doctype html><html><body style="font-family:system-ui,Segoe UI,Roboto,Inter,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 8px">Offert ${q.id}</h2>
    ${q.validUntil ? `<p style="margin:0 0 8px">Giltig till: ${new Date(q.validUntil).toLocaleDateString("sv-SE")}</p>` : ""}
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
      <thead><tr>
        <th style="text-align:left;padding:8px;border-bottom:2px solid #111;">Titel</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">Antal</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">à-pris</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">Radbelopp</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:right">
      <div>Delsumma: <strong>${oreToSEK(q.subtotal)}</strong></div>
      <div>Moms (25%): <strong>${oreToSEK(q.vat)}</strong></div>
      <div>Att betala: <strong>${oreToSEK(q.total)}</strong></div>
    </div>
  </body></html>`;
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { items: true, user: true, customer: true },
    });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (!quote.customer.email)
      return NextResponse.json({ error: "Customer has no email" }, { status: 400 });

    const html = htmlFor(quote);

    let pdf: Buffer;
    try {
      const browser = await launchBrowser();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "14mm", right: "14mm", bottom: "16mm", left: "14mm" },
      });
      await browser.close();
    } catch (err) {
      console.error("PDF generation failed:", err);
      return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
    }

    try {
      const subject = `Offert ${quote.id} – ${quote.customer.name}`;
      const res = await sendEmail({
        to: quote.customer.email,
        subject,
        html,
        attachments: [{ filename: `offert-${quote.id}.pdf`, content: pdf }],
      });
      if ((res as any)?.error) {
        console.error("Email send failed:", (res as any).error);
        return NextResponse.json({ error: "Email send failed" }, { status: 500 });
      }
    } catch (err) {
      console.error("Email send exception:", err);
      return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send route fatal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
