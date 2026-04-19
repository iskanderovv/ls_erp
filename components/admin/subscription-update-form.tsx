"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

type PlanOption = { id: string; code: "BASIC" | "PRO" | "ENTERPRISE"; name: string };

export function SubscriptionUpdateForm({
  subscriptionId,
  currentStatus,
  currentPlanId,
  planOptions,
}: {
  subscriptionId: string;
  currentStatus: "TRIAL" | "ACTIVE" | "EXPIRED";
  currentPlanId: string;
  planOptions: PlanOption[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [planId, setPlanId] = useState(currentPlanId);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiClient(`/api/admin/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, planId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-8 text-xs">
        <option value="TRIAL">Sinov</option>
        <option value="ACTIVE">Faol</option>
        <option value="EXPIRED">Muddati tugagan</option>
      </Select>
      <Select value={planId} onChange={(event) => setPlanId(event.target.value)} className="h-8 text-xs">
        {planOptions.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.code} - {plan.name}
          </option>
        ))}
      </Select>
      <Button size="sm" onClick={handleSave} disabled={loading}>
        {loading ? "..." : "Saqlash"}
      </Button>
    </div>
  );
}
