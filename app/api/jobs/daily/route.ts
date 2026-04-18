import { NextRequest, NextResponse } from "next/server";

import { runDailyAutomationJobs } from "@/lib/automation";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-job-secret");
  if (!secret || secret !== process.env.AUTOMATION_JOB_SECRET) {
    return NextResponse.json({ error: "Job secret noto'g'ri." }, { status: 401 });
  }

  const summary = await runDailyAutomationJobs();
  return NextResponse.json({ ok: true, summary });
}
