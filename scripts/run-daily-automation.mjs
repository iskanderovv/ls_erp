import "dotenv/config";

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.AUTOMATION_JOB_SECRET;

if (!secret) {
  console.error("AUTOMATION_JOB_SECRET topilmadi.");
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/jobs/daily`, {
  method: "POST",
  headers: {
    "x-job-secret": secret,
  },
});

const data = await response.json().catch(() => null);
if (!response.ok) {
  console.error(data?.error ?? "Daily automation job xatosi.");
  process.exit(1);
}

console.log("Daily automation job bajarildi:", data?.summary ?? {});
