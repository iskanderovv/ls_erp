"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiClient, ApiError } from "@/lib/api-client";

export function RunAutomationButton() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRun = async () => {
    setIsRunning(true);
    setError("");
    setMessage("");
    try {
      const result = await apiClient<{
        summary: {
          debtNotifications: number;
          attendanceAlerts: number;
          followUpTasks: number;
          systemAlerts: number;
        };
      }>("/api/automation/run", {
        method: "POST",
        body: JSON.stringify({
          runDebts: true,
          runAttendance: true,
          runLeads: true,
          runAlerts: true,
        }),
      });
      setMessage(
        `Debt: ${result.summary.debtNotifications}, Attendance: ${result.summary.attendanceAlerts}, Follow-up: ${result.summary.followUpTasks}, Alerts: ${result.summary.systemAlerts}`,
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Avtomatika ishga tushmadi.");
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleRun} disabled={isRunning}>
        {isRunning ? "Ishlamoqda..." : "Avtomatik tekshiruvni ishga tushirish"}
      </Button>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
