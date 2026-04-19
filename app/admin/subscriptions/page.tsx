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
        <h1 className="text-2xl font-semibold">Subscription management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Plan o&apos;zgartirish, trial/active/expired holatini qo&apos;lda boshqarish.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Jami subscriptions</p>
            <p className="mt-1 text-2xl font-semibold">{subscriptions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Active subscriptions</p>
            <p className="mt-1 text-2xl font-semibold">
              {subscriptions.filter((item) => item.status === SubscriptionStatus.ACTIVE).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Estimated revenue</p>
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
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Actions</TableHead>
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
