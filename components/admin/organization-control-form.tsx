"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiClient, ApiError } from "@/lib/api-client";

type OrganizationControlFormProps = {
  organization: {
    id: string;
    name: string;
    status: "ACTIVE" | "BLOCKED" | "INACTIVE";
    blockReason: string | null;
    subscriptionPlan: "BASIC" | "PRO" | "ENTERPRISE";
    ownerId: string | null;
  };
  owners: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  }>;
};

export function OrganizationControlForm({ organization, owners }: OrganizationControlFormProps) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [status, setStatus] = useState(organization.status);
  const [subscriptionPlan, setSubscriptionPlan] = useState(organization.subscriptionPlan);
  const [blockReason, setBlockReason] = useState(organization.blockReason ?? "");
  const [ownerId, setOwnerId] = useState(organization.ownerId ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setError("");
    setLoading(true);
    try {
      await apiClient(`/api/admin/organizations/${organization.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          status,
          subscriptionPlan,
          blockReason: blockReason || undefined,
          ownerId: ownerId || undefined,
        }),
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("Tashkilot sozlamalarini saqlashda xatolik.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`"${organization.name}" tashkilotini butunlay o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`)) {
      return;
    }
    setError("");
    setDeleting(true);
    try {
      await apiClient(`/api/admin/organizations/${organization.id}`, {
        method: "DELETE",
      });
      router.push("/admin/organizations");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("Tashkilotni o'chirishda xatolik.");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <FormField label="Tashkilot nomi">
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </FormField>

      <FormField label="Holat">
        <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="ACTIVE">Faol</option>
          <option value="BLOCKED">Bloklangan</option>
          <option value="INACTIVE">Nofaol</option>
        </Select>
      </FormField>

      <FormField label="Tarif">
        <Select
          value={subscriptionPlan}
          onChange={(event) => setSubscriptionPlan(event.target.value as typeof subscriptionPlan)}
        >
          <option value="BASIC">BASIC (Asosiy)</option>
          <option value="PRO">PRO</option>
          <option value="ENTERPRISE">ENTERPRISE (Korporativ)</option>
        </Select>
      </FormField>

      <FormField label="Mas'ul foydalanuvchi">
        <Select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
          <option value="">Tanlanmagan</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.firstName} {owner.lastName} ({owner.phone})
            </option>
          ))}
        </Select>
      </FormField>

      {status === "BLOCKED" ? (
        <FormField label="Blok sababi">
          <Input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} />
        </FormField>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading || deleting}>
          {loading ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={loading || deleting}>
          {deleting ? "O'chirilmoqda..." : "Tashkilotni o'chirish"}
        </Button>
      </div>
    </div>
  );
}
