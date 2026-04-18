import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { emptyToNull } from "@/lib/normalizers";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "leads.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Lid ma'lumotlari noto'g'ri." }, { status: 400 });
  }
  const existingLead = await prisma.lead.findUnique({
    where: { id },
    select: { branchId: true },
  });
  if (!existingLead) {
    return NextResponse.json({ error: "Lid topilmadi." }, { status: 404 });
  }
  if (
    !canAccessBranch(auth.session, existingLead.branchId) ||
    !canAccessBranch(auth.session, parsed.data.branchId)
  ) {
    return NextResponse.json({ error: "Tanlangan filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      firstName: parsed.data.firstName,
      lastName: emptyToNull(parsed.data.lastName),
      phone: parsed.data.phone,
      source: parsed.data.source,
      interestedSubject: emptyToNull(parsed.data.interestedSubject),
      status: parsed.data.status,
      notes: emptyToNull(parsed.data.notes),
      branchId: parsed.data.branchId,
      assignedToId: emptyToNull(parsed.data.assignedToId),
      ...(parsed.data.status === "CONTACTED" || parsed.data.status === "TRIAL_LESSON"
        ? {
            lastContactAt: new Date(),
            followUpDueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          }
        : {}),
      ...(parsed.data.status === "CONVERTED" || parsed.data.status === "LOST"
        ? {
            followUpDueAt: null,
          }
        : {}),
    },
  });

  return NextResponse.json({ lead });
}
