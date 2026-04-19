import { NextRequest, NextResponse } from "next/server";

import { handleLeadCreated } from "@/lib/automation";
import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { emptyToNull } from "@/lib/normalizers";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "leads.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Lid ma'lumotlari noto'g'ri." }, { status: 400 });
  }
  if (!canAccessBranch(auth.session, parsed.data.branchId)) {
    return NextResponse.json({ error: "Tanlangan filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const lead = await prisma.lead.create({
    data: {
      organizationId: auth.session.organizationId,
      firstName: parsed.data.firstName,
      lastName: emptyToNull(parsed.data.lastName),
      phone: parsed.data.phone,
      source: parsed.data.source,
      interestedSubject: emptyToNull(parsed.data.interestedSubject),
      status: parsed.data.status,
      notes: emptyToNull(parsed.data.notes),
      branchId: parsed.data.branchId,
      assignedToId: emptyToNull(parsed.data.assignedToId),
      followUpDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  let automationWarning: string | null = null;
  try {
    await handleLeadCreated(lead.id);
  } catch (error) {
    automationWarning =
      error instanceof Error ? error.message : "Lead avtomatik ishlovida xatolik yuz berdi.";
  }

  return NextResponse.json({ lead, automationWarning });
}
