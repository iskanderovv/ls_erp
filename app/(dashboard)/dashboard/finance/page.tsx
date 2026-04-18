import { FinanceSummaryCards } from "@/components/finance/finance-summary";
import { PageHeader } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/session";

export default async function FinancePage() {
  await requirePagePermission("finance.view");

  return (
    <div>
      <PageHeader
        title="Moliya dashboard"
        description="Tushum, qarzdorlik va to'lovlar bo'yicha asosiy ko'rsatkichlar"
      />
      <FinanceSummaryCards />
    </div>
  );
}
