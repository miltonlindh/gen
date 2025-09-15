// app/api/quotes/[id]/pdf/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

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
  } catch {}
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

  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"/><title>Offert ${q.id}</title></head>
  <body style="font-family:system-ui,Segoe UI,Roboto,Inter,Arial,sans-serif;color:#111;margin:24px;">
    <h1 style="margin:0 0 8px">Offert</h1>
    <div style="font-size:12px;color:#555">ID: ${q.id}</div>
    <div style="font-size:12px;color:#555">Datum: ${new Date(q.createdAt).toLocaleDateString("sv-SE")}</div>
    ${q.validUntil ? `<div style="font-size:12px;color:#555">Giltig till: ${new Date(q.validUntil).toLocaleDateString("sv-SE")}</div>` : ""}
    <h3 style="margin:16px 0 6px;">Kund</h3>
    <div style="font-weight:600">${q.customer.name}</div>
    ${q.customer.email ? `<div>${q.customer.email}</div>` : ""}
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
      <thead><tr>
        <th style="text-align:left;padding:8px;border-bottom:2px solid #111;">Titel</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">Antal</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">à-pris</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">Radbelopp</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="width:100%;margin-top:16px;display:flex;justify-content:flex-end;">
      <div style="min-width:280px;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;">
          <span>Delsumma</span><span>${oreToSEK(q.subtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;">
          <span>Moms (25%)</span><span>${oreToSEK(q.vat)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:700;border-top:1px solid #111;margin-top:6px;">
          <span>Att betala</span><span>${oreToSEK(q.total)}</span>
        </div>
      </div>
    </div>
  </body></html>`;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const q = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { items: true, user: true, customer: true },
    });
    if (!q) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(htmlFor(q), { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "14mm", bottom: "16mm", left: "14mm" },
    });
    await browser.close();

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="quote-${q.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF route error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
