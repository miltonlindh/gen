// app/api/quotes/[id]/pdf/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../lib/prisma"; // relativ import
import puppeteer from "puppeteer";

function oreToSEK(ore: number) {
  return (ore / 100).toLocaleString("sv-SE", { style: "currency", currency: "SEK" });
}

function templateHTML(q: any) {
  const itemsRows = q.items
    .map(
      (it: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${it.title}</td>
        <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">${it.quantity}</td>
        <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">${oreToSEK(it.unitPrice)}</td>
        <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">${oreToSEK(it.lineTotal)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <title>Offert ${q.id}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif; color:#111; margin:24px;">
  <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
    <div>
      <h1 style="margin:0;font-size:24px;">Offert</h1>
      <div style="font-size:12px;color:#555">ID: ${q.id}</div>
      <div style="font-size:12px;color:#555">Datum: ${new Date(q.createdAt).toLocaleDateString("sv-SE")}</div>
      ${q.validUntil ? `<div style="font-size:12px;color:#555">Giltig till: ${new Date(q.validUntil).toLocaleDateString("sv-SE")}</div>` : ""}
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;color:#555">Användare</div>
      <div style="font-weight:600">${q.user.email}</div>
    </div>
  </header>

  <section style="margin-bottom:16px;">
    <div style="font-size:12px;color:#555">Kund</div>
    <div style="font-weight:600">${q.customer.name}</div>
    ${q.customer.email ? `<div>${q.customer.email}</div>` : ""}
  </section>

  <table style="width:100%; border-collapse:collapse; font-size:14px; margin-top:12px;">
    <thead>
      <tr>
        <th style="text-align:left;padding:8px;border-bottom:2px solid #111;">Titel</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">Antal</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">à-pris</th>
        <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">Radbelopp</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div style="width:100%; margin-top:16px; display:flex; justify-content:flex-end;">
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

  <footer style="margin-top:36px;font-size:12px;color:#666;">
    Genererad av Offert MVP.
  </footer>
</body>
</html>`;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { items: true, user: true, customer: true },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const html = templateHTML(quote);

    const browser = await puppeteer.launch({
      // Lokalt funkar standard. På Vercel krävs annan config (TODO i deploy-steget).
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "14mm", right: "14mm", bottom: "16mm", left: "14mm" } });
    await browser.close();

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="quote-${quote.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
