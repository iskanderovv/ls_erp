import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { branchSchema } from "@/lib/validators/schemas";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, "branches.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Filial ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const existingBranch = await prisma.branch.findFirst({
    where: {
      id,
      organizationId: auth.session.organizationId,
    },
    select: { id: true },
  });
  if (!existingBranch) {
    return NextResponse.json({ error: "Filial topilmadi." }, { status: 404 });
  }

  const branch = await prisma.branch.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ branch });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, "branches.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const branch = await prisma.branch.findFirst({
      where: {
        id,
        organizationId: auth.session.organizationId,
      },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            groups: true,
            leads: true,
            payments: true,
            studentFees: true,
            paymentReminders: true,
            salaryRecords: true,
            salaryPayments: true,
            expenses: true,
            transactions: true,
            tasks: true,
            telegramMessages: true,
          },
        },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: "Filial topilmadi." }, { status: 404 });
    }

    const relationLabels = {
      students: "Talabalar",
      teachers: "Ustozlar",
      groups: "Guruhlar",
      leads: "Lidlar",
      payments: "To'lovlar",
      studentFees: "Oylik to'lov sozlamalari",
      paymentReminders: "To'lov eslatmalari",
      salaryRecords: "Oylik hisob-kitoblari",
      salaryPayments: "Oylik to'lovlari",
      expenses: "Xarajatlar",
      transactions: "Moliya tranzaksiyalari",
      tasks: "Vazifalar",
      telegramMessages: "Telegram yuborish tarixi",
    } as const;

    const blockedBy = Object.entries(relationLabels).reduce<Record<string, number>>((acc, [key, label]) => {
      const count = branch._count[key as keyof typeof relationLabels];
      if (count > 0) acc[label] = count;
      return acc;
    }, {});

    if (Object.keys(blockedBy).length > 0) {
      const details = Object.entries(blockedBy)
        .map(([label, count]) => `${label}: ${count}`)
        .join(", ");
      return NextResponse.json(
        {
          error: `Filialni o'chirib bo'lmadi. Bog'langan yozuvlar topildi: ${details}. Avval ularni o'chiring yoki boshqa filialga ko'chiring.`,
          blockedBy,
        },
        { status: 400 }
      );
    }

    await prisma.branch.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Filialni o'chirishda xatolik yuz berdi." }, { status: 500 });
  }
}
