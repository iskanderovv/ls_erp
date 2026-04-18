import { PageHeader } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/session";
import { ReportCard } from "@/components/reports/report-card";

export default async function ReportsPage() {
  await requirePagePermission("reports.view");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hisobotlar"
        description="Markaz faoliyati bo'yicha batafsil hisobotlar va eksport"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          title="Qarzdorlik hisoboti"
          description="Barcha qarzdor talabalar va ularning qarzlari miqdori"
          type="DEBT"
        />
        <ReportCard
          title="Tushumlar hisoboti"
          description="Oylar kesimida jami tushumlar va to'lov turlari"
          type="REVENUE"
        />
        <ReportCard
          title="Davomat hisoboti"
          description="Guruhlar va talabalar kesimida davomat statistikasi"
          type="ATTENDANCE"
        />
      </div>
    </div>
  );
}
