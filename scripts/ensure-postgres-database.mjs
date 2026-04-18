import "dotenv/config";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL topilmadi. .env faylini tekshiring.");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error("DATABASE_URL formati noto'g'ri.");
  process.exit(1);
}

if (!["postgresql:", "postgres:"].includes(parsed.protocol)) {
  process.exit(0);
}

const dbName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
if (!dbName) {
  console.error("DATABASE_URL ichida database nomi yo'q.");
  process.exit(1);
}

const adminUrl = new URL(databaseUrl);
adminUrl.pathname = "/postgres";
adminUrl.searchParams.delete("schema");
adminUrl.hash = "";

const escapedDbName = dbName.replaceAll('"', '""');
const sql = `CREATE DATABASE "${escapedDbName}";`;

const createdWithPsql = tryCreateWithPsql();
if (createdWithPsql.exitCode === 0) {
  process.exit(0);
}

const createdWithPrisma = tryCreateWithPrismaExecute();
if (createdWithPrisma.exitCode === 0) {
  process.exit(0);
}

const existingCheck = checkDatabaseReachable();
if (existingCheck.exitCode === 0) {
  console.log(`Database "${dbName}" allaqachon mavjud.`);
  process.exit(0);
}

console.error("Database yaratishda xatolik yuz berdi.");
for (const detail of [createdWithPsql.detail, createdWithPrisma.detail, existingCheck.detail].filter(Boolean)) {
  console.error(`- ${detail}`);
}
process.exit(1);

function tryCreateWithPsql() {
  const host = adminUrl.hostname || "localhost";
  const port = adminUrl.port || "5432";
  const user = decodeURIComponent(adminUrl.username || process.env.PGUSER || "");
  const password = decodeURIComponent(adminUrl.password || "");

  if (!user) {
    return { exitCode: 1, detail: "Postgres user topilmadi (DATABASE_URL yoki PGUSER)." };
  }

  const psqlArgs = [
    "-h",
    host,
    "-p",
    port,
    "-U",
    user,
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ];

  const result = spawnSync("psql", psqlArgs, {
    encoding: "utf-8",
    env: {
      ...process.env,
      ...(password ? { PGPASSWORD: password } : {}),
    },
  });

  if (result.error?.code === "ENOENT") {
    return { exitCode: 1, detail: "`psql` topilmadi (PATH ga qo'shilmagan)." };
  }
  if (result.error) {
    return {
      exitCode: 1,
      detail: result.error.message,
    };
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const normalizedOutput = output.toLowerCase();
  if (result.status === 0) {
    console.log(`Database "${dbName}" yaratildi.`);
    return { exitCode: 0, detail: "" };
  }
  if (isAlreadyExists(normalizedOutput)) {
    console.log(`Database "${dbName}" allaqachon mavjud.`);
    return { exitCode: 0, detail: "" };
  }

  return {
    exitCode: result.status ?? 1,
    detail: result.stderr || result.stdout || "`psql` orqali yaratishda xatolik yuz berdi.",
  };
}

function tryCreateWithPrismaExecute() {
  const executeResult = runPrismaDbExecute(adminUrl.toString(), sql);
  const normalizedOutput = executeResult.output.toLowerCase();

  if (executeResult.exitCode === 0) {
    console.log(`Database "${dbName}" yaratildi.`);
    return { exitCode: 0, detail: "" };
  }

  if (isAlreadyExists(normalizedOutput)) {
    console.log(`Database "${dbName}" allaqachon mavjud.`);
    return { exitCode: 0, detail: "" };
  }

  return {
    exitCode: executeResult.exitCode,
    detail:
      executeResult.errorDetail || executeResult.output || "Prisma orqali yaratib bo'lmadi.",
  };
}

function checkDatabaseReachable() {
  const executeResult = runPrismaDbExecute(databaseUrl, "SELECT 1;");

  if (executeResult.exitCode === 0) {
    return { exitCode: 0, detail: "" };
  }

  return {
    exitCode: executeResult.exitCode,
    detail: executeResult.errorDetail || executeResult.output || "DB ga ulanib bo'lmadi.",
  };
}

function runPrismaDbExecute(targetUrl, sqlText) {
  const localPrismaCliJs = path.join(
    process.cwd(),
    "node_modules",
    "prisma",
    "build",
    "index.js",
  );

  if (!existsSync(localPrismaCliJs)) {
    return {
      exitCode: 1,
      output: "",
      errorDetail:
        "Local Prisma CLI topilmadi. `npm install` yoki `npm i -D prisma` ni tekshiring.",
    };
  }

  const tempDir = mkdtempSync(path.join(tmpdir(), "lc-prisma-sql-"));
  const sqlFilePath = path.join(tempDir, "query.sql");
  writeFileSync(sqlFilePath, sqlText, "utf-8");

  try {
    const result = spawnSync(
      process.execPath,
      [localPrismaCliJs, "db", "execute", "--url", targetUrl, "--file", sqlFilePath],
      {
        encoding: "utf-8",
        env: process.env,
      },
    );

    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    if (result.error) {
      return {
        exitCode: 1,
        output,
        errorDetail: result.error.message,
      };
    }

    return {
      exitCode: result.status ?? 1,
      output,
      errorDetail: "",
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function isAlreadyExists(normalizedOutput) {
  return (
    normalizedOutput.includes("already exists") ||
    normalizedOutput.includes("42p04") ||
    normalizedOutput.includes("уже существует")
  );
}
