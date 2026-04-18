import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { PageHeader } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/session";

export default async function DashboardPage() {
  await requirePagePermission("dashboard.view");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Markazdagi asosiy ko'rsatkichlar va oxirgi qo'shilgan ma'lumotlar"
      />
      <DashboardOverview />
    </div>
  );
}
