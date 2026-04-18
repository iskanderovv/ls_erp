"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatDateOnlyInput } from "@/lib/date";

type SalaryRecordActionsProps = {
  recordId: string;
  canManage: boolean;
};

export function SalaryRecordActions({ recordId, canManage }: SalaryRecordActionsProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(formatDateOnlyInput(new Date()));
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!canManage) {
    return <p className="text-xs text-slate-500">Faqat ko'rish rejimi</p>;
  }

  const handlePay = async () => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await apiClient(`/api/salary/records/${recordId}/pay`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          paidAt,
          note: note.trim() || undefined,
        }),
      });
      setAmount("");
      setNote("");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("To'lovni saqlashda xatolik.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="To'lov summasi"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
      </div>
      <div className="grid gap-2 md:grid-cols-1">
        <Input
          placeholder="Izoh (ixtiyoriy)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
      <Button size="sm" onClick={handlePay} disabled={isSubmitting || !amount}>
        {isSubmitting ? "Saqlanmoqda..." : "To'lov qo'shish"}
      </Button>
    </div>
  );
}
