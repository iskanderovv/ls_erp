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
import { taskCreateSchema, type TaskCreateFormValues } from "@/lib/validators/schemas";

type TaskFormProps = {
  assignees: Array<{ id: string; name: string; branchId: string }>;
  branches: Array<{ id: string; name: string }>;
  defaultBranchId?: string;
};

export function TaskForm({ assignees, branches, defaultBranchId }: TaskFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<TaskCreateFormValues>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedToId: assignees[0]?.id ?? "",
      branchId: defaultBranchId ?? branches[0]?.id ?? "",
      relatedEntityType: "",
      relatedEntityId: "",
      dueDate: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      await apiClient("/api/tasks", {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.reset({
        title: "",
        description: "",
        assignedToId: assignees[0]?.id ?? "",
        branchId: defaultBranchId ?? branches[0]?.id ?? "",
        relatedEntityType: "",
        relatedEntityId: "",
        dueDate: "",
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Vazifa yaratishda xatolik.");
    }
  });

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <FormField label="Sarlavha" error={form.formState.errors.title?.message}>
        <Input {...form.register("title")} />
      </FormField>
      <FormField label="Izoh" error={form.formState.errors.description?.message}>
        <Textarea rows={3} {...form.register("description")} />
      </FormField>
      <div className="grid gap-3 md:grid-cols-3">
        <FormField label="Mas'ul xodim" error={form.formState.errors.assignedToId?.message}>
          <Select {...form.register("assignedToId")}>
            <option value="">Tanlang</option>
            {assignees.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Filial" error={form.formState.errors.branchId?.message}>
          <Select {...form.register("branchId")}>
            <option value="">Tanlang</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Muddat" error={form.formState.errors.dueDate?.message}>
          <Input type="date" {...form.register("dueDate")} />
        </FormField>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Entity turi" error={form.formState.errors.relatedEntityType?.message}>
          <Select {...form.register("relatedEntityType")}>
            <option value="">Tanlanmagan</option>
            <option value="LEAD">Lid</option>
            <option value="STUDENT">Talaba</option>
            <option value="GROUP">Guruh</option>
            <option value="PAYMENT">To'lov</option>
            <option value="ATTENDANCE">Davomat</option>
            <option value="SYSTEM">Tizim</option>
          </Select>
        </FormField>
        <FormField label="Entity ID" error={form.formState.errors.relatedEntityId?.message}>
          <Input {...form.register("relatedEntityId")} />
        </FormField>
      </div>
      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Yaratilmoqda..." : "Vazifa qo'shish"}
      </Button>
    </form>
  );
}
