"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type SendReminderButtonProps = {
  studentId: string;
  groupId?: string | null;
};

export function SendReminderButton({ studentId, groupId }: SendReminderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendReminder = async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/payment-reminders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId,
        groupId: groupId ?? "",
        note: "Qarzdorlik bo'yicha eslatma yuborildi.",
      }),
    });
    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Eslatma yuborishda xatolik.");
      return;
    }

    router.refresh();
  };

  return (
    <div>
      <Button size="sm" variant="outline" onClick={sendReminder} disabled={loading}>
        {loading ? "..." : "Eslatma yuborildi deb belgilash"}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
