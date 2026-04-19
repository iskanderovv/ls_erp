import Link from "next/link";
import { SubscriptionStatus } from "@prisma/client";
import { subDays } from "date-fns";

import { RevenueChart } from "@/components/admin/revenue-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const prismaCompat = prisma as typeof prisma & {
    subscription?: {
      count: (args: { where: { status: SubscriptionStatus } }) => Promise<number>;
    };
    plan?: {
      findMany: (args: {
        include: { subscriptions: { where: { status: SubscriptionStatus }; select: { id: true } } };
      }) => Promise<
        Array<{
          code: "BASIC" | "PRO" | "ENTERPRISE";
          priceCents: number;
          subscriptions: Array<{ id: string }>;
        }>
      >;
    };
  };
  const hasSubscriptionModel = Boolean(prismaCompat.subscription && prismaCompat.plan);

  const [totalOrganizations, newOrganizations] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  let activeSubscriptions = 0;
  let trialSubscriptions = 0;
  let expiredSubscriptions = 0;
  let plans: Array<{
    code: "BASIC" | "PRO" | "ENTERPRISE";
    priceCents: number;
    subscriptions: Array<{ id: string }>;
  }> = [];

  if (hasSubscriptionModel && prismaCompat.subscription && prismaCompat.plan) {
    [activeSubscriptions, trialSubscriptions, expiredSubscriptions, plans] = await Promise.all([
      prismaCompat.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      prismaCompat.subscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
      prismaCompat.subscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      prismaCompat.plan.findMany({
        include: {
          subscriptions: {
            where: { status: SubscriptionStatus.ACTIVE },
            select: { id: true },
          },
        },
      }),
    ]);
  } else {
    const organizations = await prisma.organization.findMany({
      select: { subscriptionPlan: true, subscriptionStatus: true },
    });
    activeSubscriptions = organizations.filter((item) => item.subscriptionStatus === "ACTIVE").length;
    trialSubscriptions = organizations.filter((item) => item.subscriptionStatus === "TRIAL").length;
    expiredSubscriptions = organizations.filter((item) => item.subscriptionStatus === "EXPIRED").length;
    const priceMap: Record<"BASIC" | "PRO" | "ENTERPRISE", number> = {
      BASIC: 9900000,
      PRO: 29900000,
      ENTERPRISE: 99900000,
    };
    const activeByPlan = organizations.reduce<Record<"BASIC" | "PRO" | "ENTERPRISE", number>>(
      (acc, item) => {
        if (item.subscriptionStatus === "ACTIVE") acc[item.subscriptionPlan] += 1;
        return acc;
      },
      { BASIC: 0, PRO: 0, ENTERPRISE: 0 },
    );
    plans = (Object.keys(activeByPlan) as Array<"BASIC" | "PRO" | "ENTERPRISE">).map((code) => ({
      code,
      priceCents: priceMap[code],
      subscriptions: Array.from({ length: activeByPlan[code] }).map((_, index) => ({ id: `${code}-${index}` })),
    }));
  }

  const mrrCents = plans.reduce((sum, plan) => sum + plan.priceCents * plan.subscriptions.length, 0);
  const churnRate = totalOrganizations > 0 ? (expiredSubscriptions / totalOrganizations) * 100 : 0;

  const revenueByPlan = plans.map((plan) => ({
    name: plan.code,
    revenue: Number((plan.priceCents * plan.subscriptions.length / 100).toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Asoschi boshqaruv paneli</h1>
          <p className="mt-1 text-sm text-slate-500">
            Platforma bo&apos;yicha tashkilotlar, obunalar, tushum va o&apos;sish nazorati.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Tashkilotlar</p>
            <p className="mt-1 text-2xl font-semibold">{totalOrganizations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Faol obunalar</p>
            <p className="mt-1 text-2xl font-semibold">{activeSubscriptions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Sinov obunalari</p>
            <p className="mt-1 text-2xl font-semibold">{trialSubscriptions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">MRR</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrencyFromCents(mrrCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Yangi tashkilotlar (30 kun)</p>
            <p className="mt-1 text-2xl font-semibold">{newOrganizations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Chiqib ketish</p>
            <p className="mt-1 text-2xl font-semibold">{churnRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tarif bo&apos;yicha tushum</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueByPlan} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tezkor amallar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link className="block rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50" href="/admin/organizations">
              Tashkilotlar boshqaruvi
            </Link>
            <Link className="block rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50" href="/admin/subscriptions">
              Obunalar boshqaruvi
            </Link>
            <Link className="block rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50" href="/admin/plans">
              Tariflar boshqaruvi
            </Link>
            <Link className="block rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50" href="/admin/analytics">
              Foydalanish analitikasi
            </Link>
            <Link className="block rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50" href="/admin/audit">
              Global audit jurnali
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
