import Link from "next/link";
import { notFound } from "next/navigation";

import { OrganizationControlForm } from "@/components/admin/organization-control-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { organizationStatusLabels, subscriptionStatusLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export default async function AdminOrganizationDetailsPage({ params }: Params) {
  const { id } = await params;

  const [organization, owners, recentSubscriptions] = await Promise.all([
    prisma.organization.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            users: true,
            students: true,
            groups: true,
            branches: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        role: {
          in: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    }),
    prisma.subscription.findMany({
      where: { organizationId: id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!organization) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50" href="/admin/organizations">
          ← Organizationlar
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{organization.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Status: {organizationStatusLabels[organization.status as keyof typeof organizationStatusLabels]}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Organization control</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationControlForm
              organization={{
                id: organization.id,
                name: organization.name,
                status: organization.status,
                blockReason: organization.blockReason,
                subscriptionPlan: organization.subscriptionPlan,
                ownerId: organization.ownerId,
              }}
              owners={owners}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Asosiy statistika</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-blue-700">Users</p>
              <p className="text-xl font-semibold">{organization._count.users}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-green-700">Students</p>
              <p className="text-xl font-semibold">{organization._count.students}</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3">
              <p className="text-xs text-purple-700">Groups</p>
              <p className="text-xl font-semibold">{organization._count.groups}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-700">Branches</p>
              <p className="text-xl font-semibold">{organization._count.branches}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription history</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <thead>
                <tr>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Created</TableHead>
                </tr>
              </thead>
              <tbody>
                {recentSubscriptions.map((subscription) => (
                  <tr key={subscription.id}>
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
                    <TableCell>{formatDate(subscription.createdAt)}</TableCell>
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
