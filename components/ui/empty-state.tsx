import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-slate-500">{message}</CardContent>
    </Card>
  );
}
