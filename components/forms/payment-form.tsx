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
import { paymentSchema, type PaymentFormValues } from "@/lib/validators/schemas";

type PaymentFormProps = {
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
  groups: Array<{
    id: string;
    name: string;
  }>;
};

export function PaymentForm({ students, groups }: PaymentFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId: students[0]?.id ?? "",
      groupId: "",
      amount: 0,
      paymentMethod: "CASH",
      paidAt: formatDateOnlyInput(new Date()),
      note: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError("");
    try {
      await apiClient("/api/payments", {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.reset({
        ...values,
        amount: 0,
        note: "",
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError("To'lovni saqlashda xatolik.");
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Talaba" error={form.formState.errors.studentId?.message}>
          <Select {...form.register("studentId")}>
            <option value="">Talabani tanlang</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Guruh (ixtiyoriy)" error={form.formState.errors.groupId?.message}>
          <Select {...form.register("groupId")}>
            <option value="">Tanlanmagan</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="Summa"
          error={form.formState.errors.amount?.message as string | undefined}
        >
          <Input type="number" min={0} step="0.01" {...form.register("amount")} />
        </FormField>
        <FormField label="To'lov usuli" error={form.formState.errors.paymentMethod?.message}>
          <Select {...form.register("paymentMethod")}>
            <option value="CASH">Naqd</option>
            <option value="CARD">Karta</option>
            <option value="CLICK">Click</option>
            <option value="PAYME">Payme</option>
            <option value="OTHER">Boshqa</option>
          </Select>
        </FormField>
        <FormField label="To'lov sanasi" error={form.formState.errors.paidAt?.message}>
          <Input type="date" {...form.register("paidAt")} />
        </FormField>
      </div>

      <FormField label="Izoh" error={form.formState.errors.note?.message}>
        <Textarea {...form.register("note")} />
      </FormField>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saqlanmoqda..." : "To'lovni saqlash"}
      </Button>
    </form>
  );
}
