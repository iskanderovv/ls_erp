"use client";

import { useState } from "react";
import { LucideDownload, LucideFileBarChart, LucideLoader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReportType = "DEBT" | "REVENUE" | "ATTENDANCE";

export function ReportCard({ title, description, type }: { title: string; description: string; type: ReportType }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/export?type=${type}`);
      if (!response.ok) throw new Error("Eksportda xatolik.");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type.toLowerCase()}_report_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      alert("Hisobotni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LucideFileBarChart className="w-5 h-5 text-indigo-600" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">{description}</p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideDownload className="w-4 h-4" />}
            CSV Eksport
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
