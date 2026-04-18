import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "salary.view");
  if (!auth.ok) return auth.response;

  const periodYear = request.nextUrl.searchParams.get("periodYear");
  const periodMonth = request.nextUrl.searchParams.get("periodMonth");
  const branchId = request.nextUrl.searchParams.get("branchId");
  const teacherId = request.nextUrl.searchParams.get("teacherId");

  if (branchId && !canAccessBranch(auth.session, branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const rows = await prisma.salaryRecord.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(teacherId ? { teacherId } : {}),
      ...(periodYear ? { periodYear: Number(periodYear) } : {}),
      ...(periodMonth ? { periodMonth: Number(periodMonth) } : {}),
    },
    include: {
      teacher: {
        select: { firstName: true, lastName: true, branchId: true },
      },
      branch: {
        select: { name: true },
      },
      payments: {
        select: { id: true, amountCents: true, paidAt: true },
        orderBy: { paidAt: "desc" },
      },
    },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  const scopedRows = rows.filter((row) => canAccessBranch(auth.session, row.branchId));
  return NextResponse.json({ rows: scopedRows });
}
