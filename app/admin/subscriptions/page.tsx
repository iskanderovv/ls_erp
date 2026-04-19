import { SubscriptionStatus } from "@prisma/client";

import { SubscriptionUpdateForm } from "@/components/admin/subscription-update-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { subscriptionStatusLabels } from "@/lib/constants";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminSubscriptionsPage() {
  const [subscriptions, plans] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          select: { id: true, name: true, status: true },
        },
        plan: true,
      },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);

  const totalRevenueCents = subscriptions
    .filter((item) => item.status === SubscriptionStatus.ACTIVE)
    .reduce((sum, item) => sum + item.plan.priceCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Obunalar boshqaruvi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tarifni o&apos;zgartirish, sinov/faol/muddati tugagan holatlarini qo&apos;lda boshqarish.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Jami obunalar</p>
            <p className="mt-1 text-2xl font-semibold">{subscriptions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Faol obunalar</p>
            <p className="mt-1 text-2xl font-semibold">
              {subscriptions.filter((item) => item.status === SubscriptionStatus.ACTIVE).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Taxminiy tushum</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrencyFromCents(totalRevenueCents)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptionlar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <thead>
                <tr>
                  <TableHead>Tashkilot</TableHead>
                  <TableHead>Tarif</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Boshlanish</TableHead>
                  <TableHead>Tugash</TableHead>
                  <TableHead>Amallar</TableHead>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <TableCell>{subscription.organization.name}</TableCell>
                    <TableCell>{subscription.plan.name}</TableCell>
                    <TableCell>
                      {
                        subscriptionStatusLabels[
                          subscription.status as keyof typeof subscriptionStatusLabels
                        ]
                      }
                    </TableCell>
                    <TableCell>{formatDate(subscription.startDate)}</TableCell>
                    <TableCell>{subscription.endDate ? formatDate(subscription.endDate) : "-"}</TableCell>
                    <TableCell>
                      <SubscriptionUpdateForm
                        subscriptionId={subscription.id}
                        currentStatus={subscription.status}
                        currentPlanId={subscription.planId}
                        planOptions={plans}
                      />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
