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
import { type BranchFormValues, branchSchema } from "@/lib/validators/schemas";

type BranchFormProps = {
  initialData?: {
    id: string;
    name: string;
    phone: string;
    address: string;
    landmark: string | null;
    status: "ACTIVE" | "INACTIVE";
  };
};

export function BranchForm({ initialData }: BranchFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      phone: initialData?.phone ?? "",
      address: initialData?.address ?? "",
      landmark: initialData?.landmark ?? "",
      status: initialData?.status ?? "ACTIVE",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      if (initialData) {
        await apiClient(`/api/branches/${initialData.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await apiClient("/api/branches", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      router.push("/dashboard/branches");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Filialni saqlashda xatolik.");
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Filial nomi" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </FormField>
        <FormField label="Telefon" error={form.formState.errors.phone?.message}>
          <Input {...form.register("phone")} />
        </FormField>
      </div>

      <FormField label="Manzil" error={form.formState.errors.address?.message}>
        <Input {...form.register("address")} />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Mo'ljal" error={form.formState.errors.landmark?.message}>
          <Input {...form.register("landmark")} />
        </FormField>
        <FormField label="Holat" error={form.formState.errors.status?.message}>
          <Select {...form.register("status")}>
            <option value="ACTIVE">Faol</option>
            <option value="INACTIVE">Nofaol</option>
          </Select>
        </FormField>
      </div>

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
