"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiClient, ApiError } from "@/lib/api-client";

type VoidExpenseButtonProps = {
  expenseId: string;
};

export function VoidExpenseButton({ expenseId }: VoidExpenseButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleVoid = async () => {
    const confirmed = window.confirm("Xarajatni bekor qilishni tasdiqlaysizmi?");
    if (!confirmed) return;

    setErrorMessage("");
    setIsLoading(true);
    try {
      await apiClient(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Xarajatni bekor qilishda xatolik.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" onClick={handleVoid} disabled={isLoading}>
        {isLoading ? "Bekor qilinmoqda..." : "Bekor qilish"}
      </Button>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
