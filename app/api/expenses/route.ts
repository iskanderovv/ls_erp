import { ExpenseCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { toCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validators/schemas";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "expenses.view");
  if (!auth.ok) return auth.response;

  const branchId = request.nextUrl.searchParams.get("branchId");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const category = request.nextUrl.searchParams.get("category");
  const expenseCategory = category
    ? ExpenseCategory[category as keyof typeof ExpenseCategory] ?? null
    : null;

  if (branchId && !canAccessBranch(auth.session, branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }
  if (category && !expenseCategory) {
    return NextResponse.json({ error: "Xarajat kategoriyasi noto'g'ri." }, { status: 400 });
  }

  const rows = await prisma.expense.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(expenseCategory ? { category: expenseCategory } : {}),
      ...(from || to
        ? {
            paidAt: {
              ...(from ? { gte: parseDateOnly(from) } : {}),
              ...(to ? { lte: parseDateOnly(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      branch: { select: { name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      transaction: { select: { id: true } },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  const scopedRows = rows.filter((row) => canAccessBranch(auth.session, row.branchId));
  return NextResponse.json({ rows: scopedRows });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "expenses.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Xarajat ma'lumotlari noto'g'ri." }, { status: 400 });
  }
  if (!canAccessBranch(auth.session, parsed.data.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const expense = await prisma.$transaction(async (tx) => {
    const createdExpense = await tx.expense.create({
      data: {
        organizationId: auth.session.organizationId,
        title: parsed.data.title,
        amountCents: toCents(parsed.data.amount),
        category: parsed.data.category,
        branchId: parsed.data.branchId,
        paidAt: parseDateOnly(parsed.data.paidAt),
        createdById: auth.session.userId,
        note: parsed.data.note?.trim() || null,
      },
    });

    await tx.financialTransaction.create({
      data: {
        organizationId: auth.session.organizationId,
        type: "EXPENSE",
        amountCents: createdExpense.amountCents,
        branchId: createdExpense.branchId,
        createdById: auth.session.userId,
        occurredAt: createdExpense.paidAt,
        note: createdExpense.note ?? createdExpense.title,
        expenseId: createdExpense.id,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: auth.session.organizationId,
        action: "EXPENSE_CREATED",
        entityType: "EXPENSE",
        entityId: createdExpense.id,
        branchId: createdExpense.branchId,
        createdById: auth.session.userId,
        payload: {
          amountCents: createdExpense.amountCents,
          category: createdExpense.category,
        },
      },
    });

    return createdExpense;
  });

  return NextResponse.json({ expense });
}
