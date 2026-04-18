import { notFound } from "next/navigation";

import { ExpenseForm } from "@/components/forms/expense-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { fromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export default async function EditExpensePage({ params }: Params) {
  const session = await requirePagePermission("expenses.manage");
  const { id } = await params;
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__none__";

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) notFound();
  if (!isGlobalRole && expense.branchId !== session.branchId) notFound();

  const branches = await prisma.branch.findMany({
    where: isGlobalRole ? undefined : { id: scopedBranchId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Xarajatni tahrirlash" description={expense.title} />
      <Card>
        <CardContent className="pt-5">
          <ExpenseForm
            branches={branches}
            initialData={{
              id: expense.id,
              title: expense.title,
              amount: fromCents(expense.amountCents),
              category: expense.category,
              branchId: expense.branchId,
              paidAt: expense.paidAt.toISOString().slice(0, 10),
              note: expense.note,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
