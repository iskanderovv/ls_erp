export const APP_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "TEACHER",
  "ACCOUNTANT",
] as const;

export type AppRole = (typeof APP_ROLES)[number];
