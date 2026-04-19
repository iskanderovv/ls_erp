"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

export function OwnerStatusAction({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: "ACTIVE" | "INACTIVE";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  const handleClick = async () => {
    setLoading(true);
    try {
      await apiClient(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={currentStatus === "ACTIVE" ? "destructive" : "outline"} size="sm" onClick={handleClick} disabled={loading}>
      {loading ? "..." : currentStatus === "ACTIVE" ? "Block" : "Unblock"}
    </Button>
  );
}
