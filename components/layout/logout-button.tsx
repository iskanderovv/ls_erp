"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={loading} className="gap-2">
      {loading ? (
        "Chiqilmoqda..."
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          Chiqish
        </>
      )}
    </Button>
  );
}
