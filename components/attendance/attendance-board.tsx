"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { attendanceStatusLabels } from "@/lib/constants";
import { formatDateOnlyInput } from "@/lib/date";
import { queryKeys } from "@/lib/query-keys";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

type AttendanceBoardData = {
  group: {
    id: string;
    name: string;
    branchId: string;
  };
  date: string;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    status: AttendanceStatus;
    note: string;
  }>;
};

type AttendanceBoardProps = {
  groups: Array<{ id: string; name: string }>;
};

export function AttendanceBoard({ groups }: AttendanceBoardProps) {
  const queryClient = useQueryClient();
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [date, setDate] = useState(formatDateOnlyInput(new Date()));
  const [historyFrom, setHistoryFrom] = useState(() => {
    const base = new Date();
    base.setDate(base.getDate() - 7);
    return formatDateOnlyInput(base);
  });
  const [historyTo, setHistoryTo] = useState(formatDateOnlyInput(new Date()));
  const [entries, setEntries] = useState<
    Array<{ studentId: string; status: AttendanceStatus; note: string }>
  >([]);
  const [error, setError] = useState("");

  const boardQuery = useQuery({
    enabled: Boolean(groupId),
    queryKey: queryKeys.attendance.board(groupId, date),
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance/board?groupId=${encodeURIComponent(groupId)}&date=${encodeURIComponent(date)}`,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Davomat ma'lumotlarini olishda xatolik.");
      }
      return (await response.json()) as AttendanceBoardData;
    },
  });

  useEffect(() => {
    if (!boardQuery.data) return;
    setEntries(
      boardQuery.data.students.map((student) => ({
        studentId: student.id,
        status: student.status,
        note: student.note,
      })),
    );
  }, [boardQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId,
          date,
          entries,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Davomatni saqlashda xatolik.");
      }
    },
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.board(groupId, date),
      });
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    },
  });

  const historyQuery = useQuery({
    enabled: Boolean(groupId),
    queryKey: ["attendance-history", groupId, historyFrom, historyTo],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance?groupId=${encodeURIComponent(groupId)}&from=${encodeURIComponent(historyFrom)}&to=${encodeURIComponent(historyTo)}`,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Davomat tarixini olishda xatolik.");
      }
      return (await response.json()) as {
        rows: Array<{
          id: string;
          date: string;
          status: AttendanceStatus;
          student: { firstName: string; lastName: string };
        }>;
      };
    },
  });

  const counts = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc[entry.status] += 1;
        return acc;
      },
      { PRESENT: 0, ABSENT: 0, LATE: 0 },
    );
  }, [entries]);

  const setStatusForAll = (status: AttendanceStatus) => {
    setEntries((previous) => previous.map((entry) => ({ ...entry, status })));
  };

  const setStatusForStudent = (studentId: string, status: AttendanceStatus) => {
    setEntries((previous) =>
      previous.map((entry) => (entry.studentId === studentId ? { ...entry, status } : entry)),
    );
  };

  if (groups.length === 0) {
    return <EmptyState message="Davomat uchun guruhlar topilmadi." />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Kunlik davomat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>

            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !entries.length}
            >
              {saveMutation.isPending ? "Saqlanmoqda..." : "Davomatni saqlash"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setStatusForAll("PRESENT")}>
              Hammasi kelgan
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStatusForAll("ABSENT")}>
              Hammasi kelmagan
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStatusForAll("LATE")}>
              Hammasi kechikkan
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatusCard label="Kelgan" value={counts.PRESENT} />
            <StatusCard label="Kelmagan" value={counts.ABSENT} />
            <StatusCard label="Kechikkan" value={counts.LATE} />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Talabalar ro'yxati</CardTitle>
        </CardHeader>
        <CardContent>
          {boardQuery.isLoading ? (
            <p className="text-sm text-slate-500">Yuklanmoqda...</p>
          ) : boardQuery.isError ? (
            <p className="text-sm text-red-600">
              {(boardQuery.error as Error)?.message ?? "Xatolik yuz berdi."}
            </p>
          ) : !boardQuery.data || boardQuery.data.students.length === 0 ? (
            <p className="text-sm text-slate-500">Bu guruhda talabalar yo'q.</p>
          ) : (
            <div className="space-y-2">
              {boardQuery.data.students.map((student) => {
                const entry = entries.find((item) => item.studentId === student.id);
                return (
                  <div
                    key={student.id}
                    className="flex flex-col gap-2 rounded-md border border-slate-100 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{student.phone}</p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(["PRESENT", "ABSENT", "LATE"] as const).map((status) => {
                        const isActive = entry?.status === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setStatusForStudent(student.id, status)}
                            className={`rounded-md border px-2 py-1 text-xs transition ${
                              isActive
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                          >
                            {attendanceStatusLabels[status]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Davomat tarixi (guruh kesimida)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="date" value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} />
            <Input type="date" value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} />
          </div>

          {historyQuery.isLoading ? (
            <p className="text-sm text-slate-500">Tarix yuklanmoqda...</p>
          ) : historyQuery.isError ? (
            <p className="text-sm text-red-600">
              {(historyQuery.error as Error)?.message ?? "Xatolik yuz berdi."}
            </p>
          ) : !historyQuery.data || historyQuery.data.rows.length === 0 ? (
            <p className="text-sm text-slate-500">Tanlangan davrda ma'lumot topilmadi.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {historyQuery.data.rows.map((row) => (
                <div key={row.id} className="rounded-md border border-slate-100 p-3">
                  <p className="font-medium">
                    {row.student.firstName} {row.student.lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(row.date).toLocaleDateString("uz-UZ")} • {attendanceStatusLabels[row.status]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
