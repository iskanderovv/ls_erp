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
import { type GroupFormValues, groupSchema } from "@/lib/validators/schemas";

type GroupFormProps = {
  branches: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; firstName: string; lastName: string }>;
  initialData?: {
    id: string;
    name: string;
    subject: string;
    teacherId: string | null;
    branchId: string;
    room: string | null;
    startDate: string;
    status: "FORMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
    notes: string | null;
  };
};

export function GroupForm({ branches, teachers, initialData }: GroupFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      subject: initialData?.subject ?? "",
      teacherId: initialData?.teacherId ?? "",
      branchId: initialData?.branchId ?? branches[0]?.id ?? "",
      room: initialData?.room ?? "",
      startDate: initialData?.startDate ?? "",
      status: initialData?.status ?? "FORMING",
      notes: initialData?.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      if (initialData) {
        await apiClient(`/api/groups/${initialData.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await apiClient("/api/groups", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      router.push("/dashboard/groups");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Guruhni saqlashda xatolik yuz berdi.");
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Guruh nomi" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </FormField>
        <FormField label="Fan" error={form.formState.errors.subject?.message}>
          <Input {...form.register("subject")} />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
        <FormField label="Ustoz" error={form.formState.errors.teacherId?.message}>
          <Select {...form.register("teacherId")}>
            <option value="">Tanlanmagan</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </option>
              ))}
          </Select>
        </FormField>
        <FormField label="Xona" error={form.formState.errors.room?.message}>
          <Input {...form.register("room")} />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Boshlanish sanasi" error={form.formState.errors.startDate?.message}>
          <Input type="date" {...form.register("startDate")} />
        </FormField>
        <FormField label="Status" error={form.formState.errors.status?.message}>
          <Select {...form.register("status")}>
            <option value="FORMING">Yig'ilmoqda</option>
            <option value="ACTIVE">Faol</option>
            <option value="COMPLETED">Yakunlangan</option>
            <option value="ARCHIVED">Arxiv</option>
          </Select>
        </FormField>
      </div>

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
