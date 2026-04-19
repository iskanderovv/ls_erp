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
import { planCreateSchema, type PlanCreateFormValues } from "@/lib/validators/schemas";

export function PlanForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<PlanCreateFormValues>({
    resolver: zodResolver(planCreateSchema),
    defaultValues: {
      name: "",
      code: "PRO",
      price: 0,
      maxStudents: "",
      maxBranches: "",
      featureFlags: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      await apiClient("/api/admin/plans", {
        method: "POST",
        body: JSON.stringify(values),
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Planni saqlashda xatolik.");
    }
  });

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <FormField label="Plan nomi" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} placeholder="Pro Plan" />
      </FormField>
      <div className="grid gap-3 md:grid-cols-3">
        <FormField label="Code" error={form.formState.errors.code?.message}>
          <Select {...form.register("code")}>
            <option value="BASIC">BASIC</option>
            <option value="PRO">PRO</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </Select>
        </FormField>
        <FormField label="Narx (oylik)" error={form.formState.errors.price?.message}>
          <Input type="number" min={0} step={0.01} {...form.register("price")} />
        </FormField>
        <FormField label="Max students">
          <Input type="number" min={1} {...form.register("maxStudents")} />
        </FormField>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Max branches">
          <Input type="number" min={1} {...form.register("maxBranches")} />
        </FormField>
        <FormField label="Feature flags JSON">
          <Input placeholder='{"ANALYTICS": true}' {...form.register("featureFlags")} />
        </FormField>
      </div>
      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saqlanmoqda..." : "Plan saqlash"}
      </Button>
    </form>
  );
}
