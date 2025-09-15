import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { addDays } from "date-fns";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body as { email: string; code: string };

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    // Hitta koden i databasen
    const trialCode = await prisma.trialCode.findUnique({
      where: { code },
    });

    if (!trialCode || trialCode.used) {
      return NextResponse.json({ error: "Invalid or used code" }, { status: 400 });
    }

    // Skapa eller uppdatera user
    const user = await prisma.user.upsert({
      where: { email },
      update: { trialExpiresAt: addDays(new Date(), 7) },
      create: {
        email,
        trialExpiresAt: addDays(new Date(), 7),
      },
    });

    // Markera koden som använd
    await prisma.trialCode.update({
      where: { id: trialCode.id },
      data: {
        used: true,
        usedAt: new Date(),
        usedById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, trialExpiresAt: user.trialExpiresAt },
    });
  } catch (err) {
    console.error("Trial activate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
