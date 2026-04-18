import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { branchSchema } from "@/lib/validators/schemas";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, "branches.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Filial ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const branch = await prisma.branch.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ branch });
}
