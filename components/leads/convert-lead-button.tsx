"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ConvertLeadButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onConvert = async () => {
    setError("");
    setLoading(true);
    const response = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Konvert qilishda xatolik.");
      return;
    }
    router.refresh();
  };

  return (
    <div>
      <Button size="sm" onClick={onConvert} disabled={loading}>
        {loading ? "..." : "Talabaga o'tkazish"}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
