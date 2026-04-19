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
import { organizationCreateSchema, type OrganizationCreateFormValues } from "@/lib/validators/schemas";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<OrganizationCreateFormValues>({
    resolver: zodResolver(organizationCreateSchema),
    defaultValues: {
      name: "",
      ownerPhone: "+998",
      ownerPassword: "",
      subscriptionPlan: "PRO",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      await apiClient("/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.reset({
        name: "",
        ownerPhone: "+998",
        ownerPassword: "",
        subscriptionPlan: values.subscriptionPlan,
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Tashkilotni yaratishda xatolik.");
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FormField label="Tashkilot nomi" error={form.formState.errors.name?.message}>
        <Input placeholder="Masalan: Yangi Akademiya" {...form.register("name")} />
      </FormField>
      <FormField label="Login uchun telefon" error={form.formState.errors.ownerPhone?.message}>
        <Input placeholder="+99890..." {...form.register("ownerPhone")} />
      </FormField>
      <FormField label="Login uchun parol" error={form.formState.errors.ownerPassword?.message}>
        <Input type="password" {...form.register("ownerPassword")} />
      </FormField>
      <FormField label="Tarif" error={form.formState.errors.subscriptionPlan?.message}>
        <Select {...form.register("subscriptionPlan")}>
          <option value="BASIC">BASIC (Asosiy)</option>
          <option value="PRO">PRO</option>
          <option value="ENTERPRISE">ENTERPRISE (Korporativ)</option>
        </Select>
      </FormField>
      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Yaratilmoqda..." : "Tashkilot qo'shish"}
      </Button>
    </form>
  );
}
