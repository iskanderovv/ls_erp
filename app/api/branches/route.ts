import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { branchSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "branches.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Filial ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const branch = await prisma.branch.create({
    data: parsed.data,
  });

  return NextResponse.json({ branch });
}
