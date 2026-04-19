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
  const [status, setStatus] = useState(organization.status);
  const [subscriptionPlan, setSubscriptionPlan] = useState(organization.subscriptionPlan);
  const [blockReason, setBlockReason] = useState(organization.blockReason ?? "");
  const [ownerId, setOwnerId] = useState(organization.ownerId ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError("");
    setLoading(true);
    try {
      await apiClient(`/api/admin/organizations/${organization.id}`, {
        method: "PATCH",
        body: JSON.stringify({
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
        setError("Organization sozlamalarini saqlashda xatolik.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <FormField label="Status">
        <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="BLOCKED">BLOCKED</option>
          <option value="INACTIVE">INACTIVE</option>
        </Select>
      </FormField>

      <FormField label="Plan">
        <Select
          value={subscriptionPlan}
          onChange={(event) => setSubscriptionPlan(event.target.value as typeof subscriptionPlan)}
        >
          <option value="BASIC">BASIC</option>
          <option value="PRO">PRO</option>
          <option value="ENTERPRISE">ENTERPRISE</option>
        </Select>
      </FormField>

      <FormField label="Owner user">
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
        <FormField label="Block reason">
          <Input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} />
        </FormField>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </div>
  );
}
