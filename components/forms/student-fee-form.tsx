"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatDateOnlyInput } from "@/lib/date";
import { studentFeeSchema, type StudentFeeFormValues } from "@/lib/validators/schemas";

type StudentFeeFormProps = {
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
  groups: Array<{
    id: string;
    name: string;
  }>;
  defaultStudentId?: string;
};

export function StudentFeeForm({ students, groups, defaultStudentId }: StudentFeeFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<StudentFeeFormValues>({
    resolver: zodResolver(studentFeeSchema),
    defaultValues: {
      studentId: defaultStudentId ?? students[0]?.id ?? "",
      groupId: groups[0]?.id ?? "",
      monthlyFee: 0,
      startDate: formatDateOnlyInput(new Date()),
      endDate: "",
      status: "ACTIVE",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      await apiClient("/api/student-fees", {
        method: "POST",
        body: JSON.stringify(values),
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Oylik to'lovni saqlashda xatolik.");
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Talaba" error={form.formState.errors.studentId?.message}>
          <Select {...form.register("studentId")} disabled={Boolean(defaultStudentId)}>
            <option value="">Talabani tanlang</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Guruh" error={form.formState.errors.groupId?.message}>
          <Select {...form.register("groupId")}>
            <option value="">Guruhni tanlang</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="Oylik summa"
          error={form.formState.errors.monthlyFee?.message as string | undefined}
        >
          <Input type="number" min={0} step="0.01" {...form.register("monthlyFee")} />
        </FormField>
        <FormField label="Boshlanish sanasi" error={form.formState.errors.startDate?.message}>
          <Input type="date" {...form.register("startDate")} />
        </FormField>
        <FormField label="Tugash sanasi" error={form.formState.errors.endDate?.message}>
          <Input type="date" {...form.register("endDate")} />
        </FormField>
      </div>

      <FormField label="Status" error={form.formState.errors.status?.message}>
        <Select {...form.register("status")}>
          <option value="ACTIVE">Faol</option>
          <option value="INACTIVE">Nofaol</option>
        </Select>
      </FormField>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saqlanmoqda..." : "Oylik to'lovni saqlash"}
      </Button>
    </form>
  );
}
