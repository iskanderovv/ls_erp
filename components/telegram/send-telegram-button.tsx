"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiClient, ApiError } from "@/lib/api-client";

type SendTelegramButtonProps = {
  studentId: string;
  type: "ATTENDANCE_ABSENT" | "PAYMENT_OVERDUE" | "SYSTEM_ALERT";
  recipient?: "STUDENT" | "PARENT";
  note?: string;
  label?: string;
};

export function SendTelegramButton({
  studentId,
  type,
  recipient = "STUDENT",
  note,
  label = "Telegram yuborish",
}: SendTelegramButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSend = async () => {
    setIsSending(true);
    setError("");
    setMessage("");
    try {
      const result = await apiClient<{ status: "SENT" | "FAILED" | "SKIPPED" }>("/api/telegram/send", {
        method: "POST",
        body: JSON.stringify({
          studentId,
          recipient,
          type,
          note,
        }),
      });
      setMessage(`Natija: ${result.status}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Telegram yuborishda xatolik.");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" onClick={handleSend} disabled={isSending}>
        {isSending ? "Yuborilmoqda..." : label}
      </Button>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
