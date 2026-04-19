import type { Payment, StudentFee } from "@prisma/client";

import { monthCountInRange, startOfMonth } from "@/lib/date";

type FeeWithPayments = StudentFee & {
  payments?: Payment[];
};

type FeeAmountBase = Pick<StudentFee, "startDate" | "endDate" | "monthlyFeeCents">;

export function feeExpectedAmount(fee: FeeAmountBase, now = new Date()) {
  const feeStart = startOfMonth(fee.startDate);
  const feeEnd = fee.endDate ? startOfMonth(fee.endDate) : startOfMonth(now);
  const months = Math.max(0, monthCountInRange(feeStart, feeEnd));
  return months * fee.monthlyFeeCents;
}

export function feePaidAmount(fee: FeeWithPayments) {
  return (fee.payments ?? []).reduce((sum, payment) => sum + payment.amountCents, 0);
}

export function feeDebtAmount(fee: FeeWithPayments, now = new Date()) {
  return Math.max(0, feeExpectedAmount(fee, now) - feePaidAmount(fee));
}
