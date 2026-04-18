"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { notificationSeverityLabels, notificationTypeLabels } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import { formatDate } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: keyof typeof notificationTypeLabels;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationResponse = {
  rows: NotificationItem[];
  unreadCount: number;
};

async function fetchNotifications() {
  const response = await fetch("/api/notifications?take=12", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Bildirishnomalarni olishda xatolik.");
  }
  return (await response.json()) as NotificationResponse;
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  });

  const markRead = async (id: string) => {
    await apiClient("/api/notifications/read", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
  };

  const markAllRead = async () => {
    await apiClient("/api/notifications/read", {
      method: "POST",
      body: JSON.stringify({ markAll: true }),
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
  };

  const unreadCount = query.data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="relative" onClick={() => setOpen((prev) => !prev)}>
        <Bell className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Bildirishnomalar</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-96 max-w-[90vw] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Bildirishnomalar</p>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-slate-600 hover:underline"
            >
              Barchasini o'qildi
            </button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {query.isLoading ? <p className="text-xs text-slate-500">Yuklanmoqda...</p> : null}
            {!query.isLoading && query.data?.rows.length === 0 ? (
              <p className="text-xs text-slate-500">Yangi bildirishnoma yo'q.</p>
            ) : null}
            {query.data?.rows.map((item) => (
              <div
                key={item.id}
                className={`rounded-md border p-2 text-xs ${
                  item.isRead ? "border-slate-100 bg-slate-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium">{item.title}</p>
                  <span
                    className={`rounded px-1.5 py-0.5 ${
                      item.severity === "CRITICAL"
                        ? "bg-red-100 text-red-700"
                        : item.severity === "WARNING"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {notificationSeverityLabels[item.severity]}
                  </span>
                </div>
                <p className="mb-1 text-slate-600">{item.message}</p>
                <p className="mb-2 text-[11px] text-slate-400">
                  {notificationTypeLabels[item.type]} • {formatDate(item.createdAt)}
                </p>
                <div className="flex items-center gap-3">
                  {item.link ? (
                    <Link
                      href={item.link}
                      className="text-[11px] text-blue-700 hover:underline"
                      onClick={() => markRead(item.id)}
                    >
                      Ochish
                    </Link>
                  ) : null}
                  {!item.isRead ? (
                    <button
                      type="button"
                      className="text-[11px] text-slate-600 hover:underline"
                      onClick={() => markRead(item.id)}
                    >
                      O'qildi
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
