import { FinancialTransactionType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "ledger.view");
  if (!auth.ok) return auth.response;

  const branchId = request.nextUrl.searchParams.get("branchId");
  const type = request.nextUrl.searchParams.get("type");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const transactionType = type
    ? FinancialTransactionType[type as keyof typeof FinancialTransactionType] ?? null
    : null;

  if (branchId && !canAccessBranch(auth.session, branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }
  if (type && !transactionType) {
    return NextResponse.json({ error: "Tranzaksiya turi noto'g'ri." }, { status: 400 });
  }

  const rows = await prisma.financialTransaction.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(transactionType ? { type: transactionType } : {}),
      ...(from || to
        ? {
            occurredAt: {
              ...(from ? { gte: parseDateOnly(from) } : {}),
              ...(to ? { lte: parseDateOnly(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      branch: { select: { name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      payment: { select: { id: true, studentId: true } },
      expense: { select: { id: true, title: true, status: true } },
      salaryPayment: { select: { id: true, salaryRecordId: true, teacherId: true } },
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 600,
  });

  const scopedRows = rows.filter((row) => canAccessBranch(auth.session, row.branchId));
  return NextResponse.json({ rows: scopedRows });
}
