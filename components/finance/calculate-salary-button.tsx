"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiClient, ApiError } from "@/lib/api-client";

type CalculateSalaryButtonProps = {
  teacherId: string;
  periodMonth: number;
  periodYear: number;
  disabled?: boolean;
};

export function CalculateSalaryButton({
  teacherId,
  periodMonth,
  periodYear,
  disabled,
}: CalculateSalaryButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClick = async () => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      await apiClient("/api/salary/records/calculate", {
        method: "POST",
        body: JSON.stringify({ teacherId, periodMonth, periodYear }),
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Hisoblashda xatolik.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" onClick={handleClick} disabled={disabled || isLoading}>
        {isLoading ? "Hisoblanmoqda..." : "Hisoblash"}
      </Button>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
