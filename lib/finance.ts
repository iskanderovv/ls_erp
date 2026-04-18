import type { Payment, StudentFee } from "@prisma/client";

import { feeDebtAmount, feeExpectedAmount, feePaidAmount } from "@/lib/debt";

export type FeeWithPayments = StudentFee & { payments?: Payment[] };

export function feeFinancialSummary(fee: FeeWithPayments, now = new Date()) {
  const expectedCents = feeExpectedAmount(fee, now);
  const paidCents = feePaidAmount(fee);
  const debtCents = feeDebtAmount(fee, now);

  return {
    expectedCents,
    paidCents,
    debtCents,
  };
}
