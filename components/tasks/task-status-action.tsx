"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiClient, ApiError } from "@/lib/api-client";

type TaskStatusActionProps = {
  taskId: string;
  currentStatus: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
};

export function TaskStatusAction({ taskId, currentStatus }: TaskStatusActionProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextStatus = currentStatus === "DONE" ? "IN_PROGRESS" : "DONE";
  const buttonLabel = currentStatus === "DONE" ? "Qayta ochish" : "Bajarildi";

  const handleClick = async () => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await apiClient(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Statusni yangilashda xatolik.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" disabled={isSubmitting} onClick={handleClick}>
        {isSubmitting ? "Saqlanmoqda..." : buttonLabel}
      </Button>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
