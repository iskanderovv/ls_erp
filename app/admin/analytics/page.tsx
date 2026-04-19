import { RevenueChart } from "@/components/admin/revenue-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function AdminAnalyticsPage() {
  const organizations = await prisma.organization.findMany({
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: true },
      },
      _count: {
        select: {
          students: true,
          groups: true,
          users: true,
          tasks: true,
          payments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const usageRows = organizations.map((organization) => {
    const latestSubscription = organization.subscriptions[0];
    const revenueCents =
      latestSubscription && latestSubscription.status === "ACTIVE" ? latestSubscription.plan.priceCents : 0;
    const activityScore =
      organization._count.tasks + organization._count.payments + organization._count.groups * 2;
    return {
      id: organization.id,
      name: organization.name,
      students: organization._count.students,
      groups: organization._count.groups,
      users: organization._count.users,
      activityScore,
      revenueCents,
    };
  });

  const chartData = usageRows.slice(0, 10).map((item) => ({
    name: item.name.length > 12 ? `${item.name.slice(0, 12)}...` : item.name,
    revenue: Number((item.revenueCents / 100).toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Foydalanish analitikasi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mijozlar faolligi va o&apos;sish ko&apos;rsatkichlari (talabalar, guruhlar, amallar, tushum).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tushum trendi (tashkilot kesimida, taxminiy)</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tashkilotlar bo&apos;yicha foydalanish jadvali</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <thead>
                <tr>
                  <TableHead>Tashkilot</TableHead>
                  <TableHead>Talabalar</TableHead>
                  <TableHead>Guruhlar</TableHead>
                  <TableHead>Foydalanuvchilar</TableHead>
                  <TableHead>Faollik darajasi</TableHead>
                  <TableHead>Tushum</TableHead>
                </tr>
              </thead>
              <tbody>
                {usageRows.map((row) => (
                  <tr key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.students}</TableCell>
                    <TableCell>{row.groups}</TableCell>
                    <TableCell>{row.users}</TableCell>
                    <TableCell>{row.activityScore}</TableCell>
                    <TableCell>{formatCurrencyFromCents(row.revenueCents)}</TableCell>
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
