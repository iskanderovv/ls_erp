"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type AttachStudentFormProps = {
  groupId: string;
  students: Array<{ id: string; firstName: string; lastName: string; phone: string }>;
};

export function AttachStudentForm({ groupId, students }: AttachStudentFormProps) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!studentId) {
      setError("Talabani tanlang.");
      return;
    }

    setLoading(true);
    setError("");
    const response = await fetch(`/api/groups/${groupId}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });

    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Talabani biriktirishda xatolik.");
      return;
    }

    setStudentId("");
    router.refresh();
  };

  return (
    <form className="flex flex-col gap-2 md:flex-row" onSubmit={onSubmit}>
      <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
        <option value="">Talabani tanlang</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.firstName} {student.lastName} ({student.phone})
          </option>
        ))}
      </Select>
      <Button type="submit" disabled={loading}>
        {loading ? "Biriktirilmoqda..." : "Talabani biriktirish"}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </form>
  );
}
