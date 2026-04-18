import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "audit.view");
  if (!auth.ok) return auth.response;

  const branchId = request.nextUrl.searchParams.get("branchId");
  const entityType = request.nextUrl.searchParams.get("entityType");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (branchId && !canAccessBranch(auth.session, branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const rows = await prisma.auditLog.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: parseDateOnly(from) } : {}),
              ...(to ? { lte: parseDateOnly(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      branch: { select: { name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 600,
  });

  const scopedRows = rows.filter((row) => canAccessBranch(auth.session, row.branchId));
  return NextResponse.json({ rows: scopedRows });
}
