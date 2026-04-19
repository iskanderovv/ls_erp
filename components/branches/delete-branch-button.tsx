"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DeleteBranchButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Haqiqatan ham bu filialni o'chirmoqchimisiz?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        const blockedLines =
          data && typeof data === "object" && data.blockedBy && typeof data.blockedBy === "object"
            ? Object.entries(data.blockedBy as Record<string, unknown>)
                .filter(([, count]) => typeof count === "number" && count > 0)
                .map(([label, count]) => `${label}: ${count}`)
                .join("\n")
            : "";
        alert(blockedLines ? `${data.error}\n\n${blockedLines}` : data.error || "Filialni o'chirishda xatolik.");
      } else {
        router.refresh();
      }
    } catch {
      alert("Xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="h-8 px-2"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
