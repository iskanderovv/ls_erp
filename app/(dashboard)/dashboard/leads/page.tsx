import Link from "next/link";
import { LeadSource, LeadStatus, Prisma } from "@prisma/client";

import { ConvertLeadButton } from "@/components/leads/convert-lead-button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { leadSourceLabels, leadStatusLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";

type SearchParams = Promise<{
  q?: string;
  branchId?: string;
  status?: string;
  source?: string;
}>;

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("leads.view");
  const canManage = hasPermission(session.role, "leads.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";

  const params = await searchParams;
  const query = searchValue(params.q);
  const selectedStatus = searchValue(params.status);
  const selectedSource = searchValue(params.source);
  const selectedBranch = searchValue(params.branchId);
  const branchId = isGlobalRole ? selectedBranch || null : (session.branchId ?? "__no_branch__");

  const where: Prisma.LeadWhereInput = {
    ...(branchId ? { branchId } : {}),
    ...(selectedStatus ? { status: selectedStatus as LeadStatus } : {}),
    ...(selectedSource ? { source: selectedSource as LeadSource } : {}),
    ...(query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
          ],
        }
      : {}),
  };

  const [leads, branches] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.branch.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Lidlar"
        description="Lidlarni boshqarish va talabaga aylantirish"
        actionHref={canManage ? "/dashboard/leads/new" : undefined}
        actionLabel={canManage ? "Lid qo'shish" : undefined}
      />

      <form className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5">
        <Input name="q" placeholder="Ism yoki telefon" defaultValue={query} />
        <Select name="status" defaultValue={selectedStatus}>
          <option value="">Barcha statuslar</option>
          <option value="NEW">Yangi</option>
          <option value="CONTACTED">Bog'lanilgan</option>
          <option value="TRIAL_LESSON">Sinov darsi</option>
          <option value="CONVERTED">Talabaga aylangan</option>
          <option value="LOST">Yo'qotilgan</option>
        </Select>
        <Select name="source" defaultValue={selectedSource}>
          <option value="">Barcha manbalar</option>
          <option value="TELEGRAM">Telegram</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="REFERRAL">Tavsiya</option>
          <option value="CALL">Qo'ng'iroq</option>
          <option value="WALK_IN">Markazga kelgan</option>
          <option value="OTHER">Boshqa</option>
        </Select>
        <Select name="branchId" defaultValue={selectedBranch} disabled={!isGlobalRole}>
          <option value="">Barcha filiallar</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
        <button
          type="submit"
          className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Filtrlash
        </button>
      </form>

      {leads.length === 0 ? (
        <EmptyState message="Lidlar topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Lid</TableHead>
                <TableHead>Manba</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Mas'ul</TableHead>
                <TableHead className="w-[320px]">Amallar</TableHead>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <TableCell>
                    <p className="font-medium">
                      {lead.firstName} {lead.lastName ?? ""}
                    </p>
                    <p className="text-xs text-slate-500">{lead.phone}</p>
                  </TableCell>
                  <TableCell>{leadSourceLabels[lead.source]}</TableCell>
                  <TableCell>{leadStatusLabels[lead.status]}</TableCell>
                  <TableCell>{lead.branch.name}</TableCell>
                  <TableCell>
                    {lead.assignedTo
                      ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {canManage ? (
                        <Link
                          href={`/dashboard/leads/${lead.id}/edit`}
                          className="text-sm text-slate-700 hover:underline"
                        >
                          Tahrirlash
                        </Link>
                      ) : null}
                      {canManage && !lead.convertedStudentId && lead.status !== "CONVERTED" ? (
                        <ConvertLeadButton leadId={lead.id} />
                      ) : null}
                    </div>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
