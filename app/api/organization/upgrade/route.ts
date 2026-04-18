import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.ok) return auth.response;

  // Only Super Admins and Admins can upgrade the plan
  if (auth.session.role !== "SUPER_ADMIN" && auth.session.role !== "ADMIN") {
    return NextResponse.json({ error: "Faqat administratorlar tarifni o'zgartira oladi." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { plan } = body as { plan: SubscriptionPlan };

  if (!Object.values(SubscriptionPlan).includes(plan)) {
    return NextResponse.json({ error: "Noto'g'ri tarif." }, { status: 400 });
  }

  try {
    await prisma.organization.update({
      where: { id: auth.session.organizationId },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        // In a real app, you would handle billing here
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Ma'lumotlarni yangilashda xatolik." }, { status: 500 });
  }
}
