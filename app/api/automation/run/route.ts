import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { runDailyAutomationJobs } from "@/lib/automation";
import { automationRunSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "automation.run");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = automationRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Avtomatika parametrlari noto'g'ri." }, { status: 400 });
  }

  const summary = await runDailyAutomationJobs(parsed.data);
  return NextResponse.json({ summary });
}
