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
import { type LeadFormValues, leadSchema } from "@/lib/validators/schemas";

type LeadFormProps = {
  branches: Array<{ id: string; name: string }>;
  assignees: Array<{ id: string; firstName: string; lastName: string }>;
  initialData?: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    source: "TELEGRAM" | "INSTAGRAM" | "REFERRAL" | "CALL" | "WALK_IN" | "OTHER";
    interestedSubject: string | null;
    status: "NEW" | "CONTACTED" | "TRIAL_LESSON" | "CONVERTED" | "LOST";
    notes: string | null;
    branchId: string;
    assignedToId: string | null;
  };
};

export function LeadForm({ branches, assignees, initialData }: LeadFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: initialData?.firstName ?? "",
      lastName: initialData?.lastName ?? "",
      phone: initialData?.phone ?? "",
      source: initialData?.source ?? "TELEGRAM",
      interestedSubject: initialData?.interestedSubject ?? "",
      status: initialData?.status ?? "NEW",
      notes: initialData?.notes ?? "",
      branchId: initialData?.branchId ?? branches[0]?.id ?? "",
      assignedToId: initialData?.assignedToId ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      if (initialData) {
        await apiClient(`/api/leads/${initialData.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await apiClient("/api/leads", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      router.push("/dashboard/leads");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Lidni saqlashda xatolik yuz berdi.");
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
        <FormField label="Qiziqqan fan" error={form.formState.errors.interestedSubject?.message}>
          <Input {...form.register("interestedSubject")} />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField label="Manba" error={form.formState.errors.source?.message}>
          <Select {...form.register("source")}>
            <option value="TELEGRAM">Telegram</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="REFERRAL">Tavsiya</option>
            <option value="CALL">Qo'ng'iroq</option>
            <option value="WALK_IN">Markazga kelgan</option>
            <option value="OTHER">Boshqa</option>
          </Select>
        </FormField>

        <FormField label="Status" error={form.formState.errors.status?.message}>
          <Select {...form.register("status")}>
            <option value="NEW">Yangi</option>
            <option value="CONTACTED">Bog'lanilgan</option>
            <option value="TRIAL_LESSON">Sinov darsi</option>
            <option value="CONVERTED">Talabaga aylangan</option>
            <option value="LOST">Yo'qotilgan</option>
          </Select>
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

      <FormField label="Mas'ul xodim" error={form.formState.errors.assignedToId?.message}>
        <Select {...form.register("assignedToId")}>
          <option value="">Tanlanmagan</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.firstName} {assignee.lastName}
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
