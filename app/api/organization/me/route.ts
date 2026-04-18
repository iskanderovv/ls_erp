import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.ok) return auth.response;

  // @ts-expect-error prisma.organization might be temporarily undefined until generate succeeds
  if (!prisma.organization) {
    return NextResponse.json({ error: "Prisma client hali yangilanmagan." }, { status: 503 });
  }

  // @ts-expect-error Prisma organization property
  const organization = await prisma.organization.findUnique({
    where: { id: auth.session.organizationId },
    select: {
      id: true,
      name: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      featureFlags: true,
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Tashkilot topilmadi." }, { status: 404 });
  }

  return NextResponse.json(organization);
}
