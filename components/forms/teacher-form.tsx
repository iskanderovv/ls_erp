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
import { type TeacherFormValues, teacherSchema } from "@/lib/validators/schemas";

type TeacherFormProps = {
  branches: Array<{ id: string; name: string }>;
  initialData?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    specialtySubjects: string[];
    branchId: string;
    status: "ACTIVE" | "INACTIVE";
    hiredAt: string | null;
    notes: string | null;
  };
};

export function TeacherForm({ branches, initialData }: TeacherFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      firstName: initialData?.firstName ?? "",
      lastName: initialData?.lastName ?? "",
      phone: initialData?.phone ?? "",
      specialtySubjects: initialData?.specialtySubjects.join(", ") ?? "",
      branchId: initialData?.branchId ?? branches[0]?.id ?? "",
      status: initialData?.status ?? "ACTIVE",
      hiredAt: initialData?.hiredAt ?? "",
      notes: initialData?.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      if (initialData) {
        await apiClient(`/api/teachers/${initialData.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await apiClient("/api/teachers", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      router.push("/dashboard/teachers");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Ustozni saqlashda xatolik yuz berdi.");
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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Fanlar" error={form.formState.errors.specialtySubjects?.message}>
          <Input placeholder="IELTS, General English" {...form.register("specialtySubjects")} />
        </FormField>
        <FormField label="Status" error={form.formState.errors.status?.message}>
          <Select {...form.register("status")}>
            <option value="ACTIVE">Faol</option>
            <option value="INACTIVE">Nofaol</option>
          </Select>
        </FormField>
      </div>

      <FormField label="Ishga kirgan sana" error={form.formState.errors.hiredAt?.message}>
        <Input type="date" {...form.register("hiredAt")} />
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
