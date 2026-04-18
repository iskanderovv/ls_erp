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
import { formatDateOnlyInput } from "@/lib/date";
import { expenseSchema, type ExpenseFormValues } from "@/lib/validators/schemas";

type BranchOption = {
  id: string;
  name: string;
};

type ExpenseFormProps = {
  branches: BranchOption[];
  initialData?: {
    id: string;
    title: string;
    amount: number;
    category: "RENT" | "SALARY" | "MARKETING" | "UTILITIES" | "EQUIPMENT" | "OTHER";
    branchId: string;
    paidAt: string;
    note: string | null;
  };
};

export function ExpenseForm({ branches, initialData }: ExpenseFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      amount: initialData?.amount ?? 0,
      category: initialData?.category ?? "OTHER",
      branchId: initialData?.branchId ?? branches[0]?.id ?? "",
      paidAt: initialData?.paidAt ?? formatDateOnlyInput(new Date()),
      note: initialData?.note ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      if (initialData) {
        await apiClient(`/api/expenses/${initialData.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await apiClient("/api/expenses", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      router.push("/dashboard/expenses");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Xarajatni saqlashda xatolik.");
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FormField label="Xarajat nomi" error={form.formState.errors.title?.message}>
        <Input {...form.register("title")} />
      </FormField>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="Summa"
          error={form.formState.errors.amount?.message as string | undefined}
        >
          <Input type="number" min={0} step="0.01" {...form.register("amount")} />
        </FormField>
        <FormField label="Kategoriya" error={form.formState.errors.category?.message}>
          <Select {...form.register("category")}>
            <option value="RENT">Ijara</option>
            <option value="SALARY">Oylik</option>
            <option value="MARKETING">Marketing</option>
            <option value="UTILITIES">Kommunal</option>
            <option value="EQUIPMENT">Jihoz</option>
            <option value="OTHER">Boshqa</option>
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

      <FormField label="To'langan sana" error={form.formState.errors.paidAt?.message}>
        <Input type="date" {...form.register("paidAt")} />
      </FormField>

      <FormField label="Izoh" error={form.formState.errors.note?.message}>
        <Textarea {...form.register("note")} />
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
