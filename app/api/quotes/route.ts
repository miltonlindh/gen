// app/api/quotes/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma"; // relativ import till lib/prisma

const ItemSchema = z.object({
  title: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(), // SEK (t.ex. 149). Servern konverterar till öre.
});

const BodySchema = z.object({
  userEmail: z.string().email(),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    orgNumber: z.string().optional(),
  }),
  items: z.array(ItemSchema).min(1),
  validUntil: z.string().optional(), // ISO-date "YYYY-MM-DD"
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userEmail, customer, items, validUntil } = parsed.data;

    // --- TRIAL GATE ---
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user || !user.trialExpiresAt) {
      return NextResponse.json(
        { error: "Trial required. Activate your trial first." },
        { status: 403 }
      );
    }
    if (user.trialExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Trial expired. Please extend or upgrade." },
        { status: 403 }
      );
    }
    // -------------------

    // Hämta eller skapa kund för denna user
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        userId: user.id,
        name: customer.name,
        email: customer.email ?? null,
      },
    });

    const dbCustomer =
      existingCustomer ??
      (await prisma.customer.create({
        data: {
          userId: user.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          orgNumber: customer.orgNumber,
        },
      }));

    // SEK → öre (heltal) och totals
    const itemsInOre = items.map((it) => ({
      title: it.title,
      quantity: it.quantity,
      unitPrice: Math.round(it.unitPrice * 100),
      lineTotal: Math.round(it.quantity * it.unitPrice * 100),
    }));

    const subtotal = itemsInOre.reduce((acc, it) => acc + it.lineTotal, 0);
    const vat = Math.round(subtotal * 0.25); // 25% moms
    const total = subtotal + vat;

    const quote = await prisma.quote.create({
      data: {
        userId: user.id,
        customerId: dbCustomer.id,
        validUntil: validUntil ? new Date(validUntil) : null,
        subtotal,
        vat,
        total,
        currency: "SEK",
        items: {
          createMany: {
            data: itemsInOre.map((it) => ({
              title: it.title,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              lineTotal: it.lineTotal,
            })),
          },
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      quoteId: quote.id,
      totals: { subtotal, vat, total, currency: "SEK" },
    });
  } catch (err) {
    console.error("Create quote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
