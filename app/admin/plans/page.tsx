import { PlanForm } from "@/components/admin/plan-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminPlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tariflar boshqaruvi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tariflarni yaratish yoki tahrirlash, limitlarni va feature flaglarni belgilash.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tarif yaratish / yangilash</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanForm />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Planlar ro&apos;yxati</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <thead>
                  <tr>
                    <TableHead>Kod</TableHead>
                    <TableHead>Nomi</TableHead>
                    <TableHead>Narx</TableHead>
                    <TableHead>Talabalar limiti</TableHead>
                    <TableHead>Filiallar limiti</TableHead>
                    <TableHead>Faol</TableHead>
                    <TableHead>Obunalar</TableHead>
                    <TableHead>Yaratilgan</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <TableCell>{plan.code}</TableCell>
                      <TableCell>{plan.name}</TableCell>
                      <TableCell>{formatCurrencyFromCents(plan.priceCents)}</TableCell>
                      <TableCell>{plan.maxStudents ?? "-"}</TableCell>
                      <TableCell>{plan.maxBranches ?? "-"}</TableCell>
                      <TableCell>{plan.isActive ? "Ha" : "Yo&apos;q"}</TableCell>
                      <TableCell>{plan._count.subscriptions}</TableCell>
                      <TableCell>{formatDate(plan.createdAt)}</TableCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
