"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, ApiError } from "@/lib/api-client";
import { type StudentFormValues, studentSchema } from "@/lib/validators/schemas";

type BranchOption = {
  id: string;
  name: string;
};

type StudentFormProps = {
  branches: BranchOption[];
  initialData?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    parentPhone: string | null;
    gender: "MALE" | "FEMALE" | null;
    birthDate: string | null;
    schoolName: string | null;
    gradeLevel: string | null;
    targetExamYear: number | null;
    notes: string | null;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    branchId: string;
  };
};

export function StudentForm({ branches, initialData }: StudentFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: initialData?.firstName ?? "",
      lastName: initialData?.lastName ?? "",
      phone: initialData?.phone ?? "",
      parentPhone: initialData?.parentPhone ?? "",
      gender: initialData?.gender ?? "",
      birthDate: initialData?.birthDate ?? "",
      schoolName: initialData?.schoolName ?? "",
      gradeLevel: initialData?.gradeLevel ?? "",
      targetExamYear: initialData?.targetExamYear ?? undefined,
      notes: initialData?.notes ?? "",
      status: initialData?.status ?? "ACTIVE",
      branchId: initialData?.branchId ?? branches[0]?.id ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      if (initialData) {
        await apiClient(`/api/students/${initialData.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await apiClient("/api/students", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      router.push("/dashboard/students");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Talabani saqlashda xatolik yuz berdi.");
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Ism" error={form.formState.errors.firstName?.message}>
          <Input {...form.register("firstName")} />
        </FormField>
        <FormField label="Familiya" error={form.formState.errors.lastName?.message}>
          <Input {...form.register("lastName")} />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Telefon" error={form.formState.errors.phone?.message}>
          <Input {...form.register("phone")} />
        </FormField>
        <FormField label="Ota-ona telefoni" error={form.formState.errors.parentPhone?.message}>
          <Input {...form.register("parentPhone")} />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField label="Jinsi" error={form.formState.errors.gender?.message}>
          <Select {...form.register("gender")}>
            <option value="">Tanlanmagan</option>
            <option value="MALE">Erkak</option>
            <option value="FEMALE">Ayol</option>
          </Select>
        </FormField>
        <FormField label="Tug'ilgan sana" error={form.formState.errors.birthDate?.message}>
          <Input type="date" {...form.register("birthDate")} />
        </FormField>
        <FormField label="Status" error={form.formState.errors.status?.message}>
          <Select {...form.register("status")}>
            <option value="ACTIVE">Faol</option>
            <option value="INACTIVE">Nofaol</option>
            <option value="ARCHIVED">Arxiv</option>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField label="Maktab" error={form.formState.errors.schoolName?.message}>
          <Input {...form.register("schoolName")} />
        </FormField>
        <FormField label="Sinf" error={form.formState.errors.gradeLevel?.message}>
          <Input {...form.register("gradeLevel")} />
        </FormField>
        <FormField
          label="Maqsad yili"
          error={form.formState.errors.targetExamYear?.message as string | undefined}
        >
          <Input type="number" min={2025} max={2100} {...form.register("targetExamYear")} />
        </FormField>
      </div>

      <FormField label="Filial" error={form.formState.errors.branchId?.message}>
        <Select {...form.register("branchId")}>
          <option value="">Filialni tanlang</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Izoh" error={form.formState.errors.notes?.message}>
        <Textarea {...form.register("notes")} />
      </FormField>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Bekor qilish
        </Button>
      </div>
    </form>
  );
}
