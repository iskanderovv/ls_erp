"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient, ApiError } from "@/lib/api-client";

type TelegramConfigFormProps = {
  studentId: string;
  initial: {
    telegramChatId: string | null;
    telegramOptIn: boolean;
    parentTelegramChatId: string | null;
    parentTelegramOptIn: boolean;
  };
};

export function TelegramConfigForm({ studentId, initial }: TelegramConfigFormProps) {
  const router = useRouter();
  const [telegramChatId, setTelegramChatId] = useState(initial.telegramChatId ?? "");
  const [telegramOptIn, setTelegramOptIn] = useState(initial.telegramOptIn);
  const [parentTelegramChatId, setParentTelegramChatId] = useState(initial.parentTelegramChatId ?? "");
  const [parentTelegramOptIn, setParentTelegramOptIn] = useState(initial.parentTelegramOptIn);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onSave = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient(`/api/students/${studentId}/telegram`, {
        method: "PATCH",
        body: JSON.stringify({
          telegramChatId,
          telegramOptIn,
          parentTelegramChatId,
          parentTelegramOptIn,
        }),
      });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Telegram sozlamalarini saqlab bo'lmadi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">Talaba chat ID</p>
          <Input value={telegramChatId} onChange={(event) => setTelegramChatId(event.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={telegramOptIn}
            onChange={(event) => setTelegramOptIn(event.target.checked)}
          />
          Talaba uchun Telegram opt-in
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">Ota-ona chat ID</p>
          <Input
            value={parentTelegramChatId}
            onChange={(event) => setParentTelegramChatId(event.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={parentTelegramOptIn}
            onChange={(event) => setParentTelegramOptIn(event.target.checked)}
          />
          Ota-ona uchun Telegram opt-in
        </label>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <Button type="button" onClick={onSave} disabled={isSubmitting}>
        {isSubmitting ? "Saqlanmoqda..." : "Telegram sozlamalarini saqlash"}
      </Button>
    </div>
  );
}
