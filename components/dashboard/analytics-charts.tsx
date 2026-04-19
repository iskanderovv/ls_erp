"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionModal } from "@/components/dashboard/subscription-modal";
import { useFeatureAccess } from "@/lib/hooks/use-feature-access";
import { queryKeys } from "@/lib/query-keys";

type AnalyticsData = {
  monthlyGrowth: Array<{ name: string; count: number }>;
  monthlyRevenue: Array<{ name: string; amount: number }>;
  leadDistribution: Array<{ name: string; value: number }>;
};

async function fetchAnalytics() {
  const response = await fetch("/api/dashboard/analytics");
  if (!response.ok) throw new Error("Tahlil ma'lumotlarini yuklab bo'lmadi.");
  return response.json() as Promise<AnalyticsData>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function AnalyticsCharts() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hasAccess = useFeatureAccess("ANALYTICS");

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: [...queryKeys.dashboard.summary, "analytics"],
    queryFn: fetchAnalytics,
    enabled: hasAccess,
  });

  if (!hasAccess) {
    return null;
  }

  if (isLoading) return <div className="p-4 text-center">Tahlillar yuklanmoqda...</div>;
  if (isError || !data || !mounted) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Talabalar o'sishi (oxirgi 6 oy)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data.monthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tushumlar o'zgarishi (oxirgi 6 oy, mln)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={data.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Lidlar holati bo'yicha taqsimoti</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={data.leadDistribution.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                minAngle={15}
              >
                {data.leadDistribution
                  .filter((d) => d.value > 0)
                  .map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
