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
import { salaryConfigSchema, type SalaryConfigFormValues } from "@/lib/validators/schemas";

type TeacherOption = {
  id: string;
  fullName: string;
};

type SalaryConfigFormProps = {
  teachers: TeacherOption[];
};

export function SalaryConfigForm({ teachers }: SalaryConfigFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<SalaryConfigFormValues>({
    resolver: zodResolver(salaryConfigSchema),
    defaultValues: {
      teacherId: teachers[0]?.id ?? "",
      type: "FIXED",
      unitAmount: 0,
      percentage: undefined,
      effectiveFrom: formatDateOnlyInput(new Date()),
      effectiveTo: "",
      isActive: true,
    },
  });

  const type = form.watch("type");

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      await apiClient("/api/salary/configs", {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.reset({
        teacherId: teachers[0]?.id ?? "",
        type: "FIXED",
        unitAmount: 0,
        percentage: undefined,
        effectiveFrom: formatDateOnlyInput(new Date()),
        effectiveTo: "",
        isActive: true,
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Oylik sozlamasini saqlashda xatolik.");
    }
  });

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 space-y-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-slate-800">Oylik modeli qo'shish</h3>
      <FormField label="Ustoz" error={form.formState.errors.teacherId?.message}>
        <Select {...form.register("teacherId")}>
          <option value="">Ustozni tanlang</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.fullName}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Model" error={form.formState.errors.type?.message}>
          <Select {...form.register("type")}>
            <option value="FIXED">Fixed (oylik summa)</option>
            <option value="PER_STUDENT">Per student</option>
            <option value="PER_GROUP">Per group</option>
            <option value="PERCENTAGE">Percentage</option>
          </Select>
        </FormField>
        {type === "PERCENTAGE" ? (
          <FormField
            label="Foiz qiymati"
            error={form.formState.errors.percentage?.message as string | undefined}
          >
            <Input type="number" min={0} max={100} step="0.01" {...form.register("percentage")} />
          </FormField>
        ) : (
          <FormField
            label="Birlik qiymat"
            error={form.formState.errors.unitAmount?.message as string | undefined}
          >
            <Input type="number" min={0} step="0.01" {...form.register("unitAmount")} />
          </FormField>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Boshlanish sanasi" error={form.formState.errors.effectiveFrom?.message}>
          <Input type="date" {...form.register("effectiveFrom")} />
        </FormField>
        <FormField label="Tugash sanasi" error={form.formState.errors.effectiveTo?.message}>
          <Input type="date" {...form.register("effectiveTo")} />
        </FormField>
      </div>

      <FormField label="Faol holat" error={form.formState.errors.isActive?.message}>
        <Select
          {...form.register("isActive", {
            setValueAs: (value) => value === "true",
          })}
        >
          <option value="true">Faol</option>
          <option value="false">Nofaol</option>
        </Select>
      </FormField>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saqlanmoqda..." : "Qo'shish"}
      </Button>
    </form>
  );
}
