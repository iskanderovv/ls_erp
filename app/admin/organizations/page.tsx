import Link from "next/link";
import { OrganizationStatus } from "@prisma/client";

import { CreateOrganizationForm } from "@/components/admin/create-organization-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { organizationStatusLabels, subscriptionPlanLabels, subscriptionStatusLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";
import { formatDate } from "@/lib/utils";

type SearchParams = Promise<{
  search?: string;
  status?: string;
}>;

export default async function AdminOrganizationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = searchValue(params.search);
  const status = searchValue(params.status);

  const organizations = await prisma.organization.findMany({
    where: {
      ...(search
        ? {
            OR: [{ name: { contains: search, mode: "insensitive" } }, { id: { contains: search } }],
          }
        : {}),
      ...(status ? { status: status as OrganizationStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      owner: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          students: true,
          groups: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tashkilotlar boshqaruvi</h1>
        <p className="mt-1 text-sm text-slate-500">Barcha mijoz tashkilotlarini boshqarish paneli.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Qidiruv va filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3">
            <Input name="search" defaultValue={search} placeholder="Tashkilot nomi yoki ID" />
            <Select name="status" defaultValue={status}>
              <option value="">Barcha statuslar</option>
              <option value="ACTIVE">Faol</option>
              <option value="BLOCKED">Bloklangan</option>
              <option value="INACTIVE">Nofaol</option>
            </Select>
            <button className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white" type="submit">
              Qo&apos;llash
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organizationlar ro&apos;yxati</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <thead>
                  <tr>
                    <TableHead>Nomi</TableHead>
                    <TableHead>Mas&apos;ul</TableHead>
                    <TableHead>Tarif</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Talabalar</TableHead>
                    <TableHead>Faol guruhlar</TableHead>
                    <TableHead>Obuna holati</TableHead>
                    <TableHead>Yaratilgan</TableHead>
                    <TableHead />
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((organization) => (
                    <tr key={organization.id}>
                      <TableCell>{organization.name}</TableCell>
                      <TableCell>
                        {organization.owner
                          ? `${organization.owner.firstName} ${organization.owner.lastName}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {
                          subscriptionPlanLabels[
                            organization.subscriptionPlan as keyof typeof subscriptionPlanLabels
                          ]
                        }
                      </TableCell>
                      <TableCell>
                        {organizationStatusLabels[organization.status as keyof typeof organizationStatusLabels]}
                      </TableCell>
                      <TableCell>{organization._count.students}</TableCell>
                      <TableCell>{organization._count.groups}</TableCell>
                      <TableCell>
                        {
                          subscriptionStatusLabels[
                            organization.subscriptionStatus as keyof typeof subscriptionStatusLabels
                          ]
                        }
                      </TableCell>
                      <TableCell>{formatDate(organization.createdAt)}</TableCell>
                      <TableCell>
                        <Link className="text-xs font-medium text-blue-700 hover:underline" href={`/admin/organizations/${organization.id}`}>
                          Boshqarish
                        </Link>
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Yangi organization</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateOrganizationForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
