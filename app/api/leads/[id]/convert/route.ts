import { LeadStatus, StudentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "leads.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      organizationId: auth.session.organizationId,
    },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lid topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, lead.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  if (lead.convertedStudentId || lead.status === LeadStatus.CONVERTED) {
    return NextResponse.json({ error: "Bu lid allaqachon konvert qilingan." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        organizationId: lead.organizationId,
        firstName: lead.firstName,
        lastName: lead.lastName ?? "-",
        phone: lead.phone,
        notes: lead.notes,
        status: StudentStatus.ACTIVE,
        branchId: lead.branchId,
      },
    });

    const updatedLead = await tx.lead.update({
      where: { id: lead.id },
      data: {
        status: LeadStatus.CONVERTED,
        convertedStudentId: student.id,
        followUpDueAt: null,
        lastContactAt: new Date(),
      },
    });

    return {
      student,
      lead: updatedLead,
    };
  });

  return NextResponse.json(result);
}
