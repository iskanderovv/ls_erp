"use client";

import { useState } from "react";
import { LucideCheck, LucideLoader2 } from "lucide-react";
import { SubscriptionPlan } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type PlanInfo = {
  name: string;
  price: string;
  features: string[];
  color: string;
};

const PLANS: Record<SubscriptionPlan, PlanInfo> = {
  BASIC: {
    name: "Basic",
    price: "Bepul",
    features: ["1 ta filial", "100 tagacha talaba", "Asosiy funksiyalar"],
    color: "bg-slate-100",
  },
  PRO: {
    name: "Pro",
    price: "499,000 so'm / oy",
    features: ["3 ta filial", "500 tagacha talaba", "Analytics & Hisobotlar", "Telegram xabarlar"],
    color: "bg-indigo-50 border-indigo-200",
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: "999,000 so'm / oy",
    features: ["10 ta filial", "5000 tagacha talaba", "Barcha funksiyalar", "24/7 Support"],
    color: "bg-amber-50 border-amber-200",
  },
};

export function SubscriptionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);

  const { data: org } = useQuery({
    queryKey: ["organization", "me"],
    queryFn: async () => {
      const res = await fetch("/api/organization/me");
      return res.json();
    },
  });

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (plan === org?.subscriptionPlan) return;
    
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/organization/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      
      if (!res.ok) throw new Error();
      
      await queryClient.invalidateQueries({ queryKey: ["organization", "me"] });
      onClose();
      alert("Tarif muvaffaqiyatli o'zgartirildi!");
    } catch (error) {
      alert("Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.");
    } finally {
      setLoadingPlan(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold">Tarifni yangilash</h2>
          <p className="text-slate-500 text-sm">Markazingiz uchun mos tarifni tanlang</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {(Object.entries(PLANS) as [SubscriptionPlan, PlanInfo][]).map(([id, plan]) => (
            <Card key={id} className={`relative flex flex-col ${plan.color} ${org?.subscriptionPlan === id ? "ring-2 ring-indigo-600" : ""}`}>
              {org?.subscriptionPlan === id && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white uppercase">
                  Joriy tarif
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-xl font-bold">{plan.price}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="mb-6 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                      <LucideCheck className="h-3 w-3 text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={id === "ENTERPRISE" ? "default" : "outline"}
                  disabled={org?.subscriptionPlan === id || !!loadingPlan}
                  onClick={() => handleUpgrade(id)}
                >
                  {loadingPlan === id ? <LucideLoader2 className="h-4 w-4 animate-spin" /> : "Tanlash"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <button onClick={onClose} className="mt-6 w-full text-sm text-slate-500 hover:underline">
          Yopish
        </button>
      </div>
    </div>
  );
}
