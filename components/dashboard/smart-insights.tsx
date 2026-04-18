"use client";

import { useQuery } from "@tanstack/react-query";
import { LucideAlertTriangle, LucideTrendingUp, LucideUsers } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SmartInsightsData = {
  churnRisk: Array<{ id: string; firstName: string; lastName: string; reason: string }>;
  highValue: Array<{ id: string; firstName: string; lastName: string }>;
  weakGroups: Array<{ id: string; name: string; count: number }>;
};

async function fetchSmartInsights() {
  const response = await fetch("/api/dashboard/smart-insights");
  if (!response.ok) throw new Error("Insights yuklab bo'lmadi.");
  return response.json() as Promise<SmartInsightsData>;
}

export function SmartInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "smart-insights"],
    queryFn: fetchSmartInsights,
  });

  if (isLoading || !data) return null;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="border-red-100 bg-red-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-red-700">
            <LucideAlertTriangle className="w-5 h-5" />
            <CardTitle className="text-sm uppercase tracking-wider">Tark etish xavfi (Churn)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.churnRisk.length === 0 ? (
              <p className="text-xs text-slate-500">Hozircha xavf yo'q.</p>
            ) : (
              data.churnRisk.map((s) => (
                <div key={s.id} className="text-sm">
                  <p className="font-medium">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-red-600">{s.reason}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-100 bg-green-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-green-700">
            <LucideTrendingUp className="w-5 h-5" />
            <CardTitle className="text-sm uppercase tracking-wider">Eng faol talabalar</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.highValue.map((s) => (
              <div key={s.id} className="text-sm">
                <p className="font-medium">{s.firstName} {s.lastName}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-100 bg-amber-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-amber-700">
            <LucideUsers className="w-5 h-5" />
            <CardTitle className="text-sm uppercase tracking-wider">Kichik guruhlar</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.weakGroups.map((g) => (
              <div key={g.id} className="text-sm">
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-amber-700">{g.count} ta talaba</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
