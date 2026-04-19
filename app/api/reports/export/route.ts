import { StudentFeeStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { getBranchFilter } from "@/lib/auth/branch-scope";
import { feeExpectedAmount } from "@/lib/debt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "reports.view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const branchFilter = getBranchFilter(auth.session);

  let csvContent = "";
  let fileName = "report.csv";

  if (type === "DEBT") {
    const activeFees = await prisma.studentFee.findMany({
      where: {
        status: StudentFeeStatus.ACTIVE,
        ...branchFilter,
      },
      include: {
        student: true,
        group: true,
      },
    });

    const now = new Date();
    const rows = await Promise.all(
      activeFees.map(async (fee) => {
        const paid = await prisma.payment.aggregate({
          where: {
            studentId: fee.studentId,
            groupId: fee.groupId,
            paidAt: {
              gte: fee.startDate,
              lte: fee.endDate ?? now,
            },
          },
          _sum: { amountCents: true },
        });
        const debt = Math.max(0, feeExpectedAmount(fee, now) - (paid._sum.amountCents ?? 0));
        
        if (debt > 0) {
          return [
            `${fee.student.firstName} ${fee.student.lastName}`,
            fee.student.phone,
            fee.group.name,
            (debt / 100).toFixed(2),
          ];
        }
        return null;
      }),
    );

    const filteredRows = rows.filter((r): r is string[] => r !== null);
    csvContent = [
      ["F.I.SH", "Telefon", "Guruh", "Qarzdorlik (so'm)"].join(","),
      ...filteredRows.map((r) => r.join(",")),
    ].join("\n");
    fileName = "qarzdorlik_hisoboti.csv";
  } else if (type === "REVENUE") {
    const payments = await prisma.payment.findMany({
      where: branchFilter,
      include: { student: true, group: true },
      orderBy: { paidAt: "desc" },
    });

    csvContent = [
      ["Sana", "Talaba", "Guruh", "Summa", "Turi"].join(","),
      ...payments.map((p) =>
        [
          p.paidAt.toISOString().split("T")[0],
          `${p.student?.firstName} ${p.student?.lastName}`,
          p.group?.name ?? "-",
          (p.amountCents / 100).toFixed(2),
          p.paymentMethod,
        ].join(","),
      ),
    ].join("\n");
    fileName = "tushumlar_hisoboti.csv";
  } else {
    return NextResponse.json({ error: "Noto'g'ri hisobot turi." }, { status: 400 });
  }

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${fileName}`,
    },
  });
}
