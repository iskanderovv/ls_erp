import type { AppRole } from "@/lib/auth/roles";

export const APP_NAME = "EduMarkaz";
export const SESSION_COOKIE_NAME = "lc_session";

export const roleLabels: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Menejer",
  TEACHER: "Ustoz",
  ACCOUNTANT: "Hisobchi",
};

export const branchStatusLabels = {
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
} as const;

export const studentStatusLabels = {
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  ARCHIVED: "Arxiv",
} as const;

export const leadStatusLabels = {
  NEW: "Yangi",
  CONTACTED: "Bog'lanilgan",
  TRIAL_LESSON: "Sinov darsi",
  CONVERTED: "Talabaga aylangan",
  LOST: "Yo'qotilgan",
} as const;

export const leadSourceLabels = {
  TELEGRAM: "Telegram",
  INSTAGRAM: "Instagram",
  REFERRAL: "Tavsiya",
  CALL: "Qo'ng'iroq",
  WALK_IN: "Markazga kelgan",
  OTHER: "Boshqa",
} as const;

export const teacherStatusLabels = {
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
} as const;

export const groupStatusLabels = {
  FORMING: "Yig'ilmoqda",
  ACTIVE: "Faol",
  COMPLETED: "Yakunlangan",
  ARCHIVED: "Arxiv",
} as const;

export const genderLabels = {
  MALE: "Erkak",
  FEMALE: "Ayol",
} as const;

export const attendanceStatusLabels = {
  PRESENT: "Kelgan",
  ABSENT: "Kelmagan",
  LATE: "Kechikkan",
} as const;

export const paymentMethodLabels = {
  CASH: "Naqd",
  CARD: "Karta",
  CLICK: "Click",
  PAYME: "Payme",
  OTHER: "Boshqa",
} as const;

export const studentFeeStatusLabels = {
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
} as const;

export const salaryTypeLabels = {
  FIXED: "Fix oylik",
  PER_STUDENT: "Har talaba uchun",
  PER_GROUP: "Har guruh uchun",
  PERCENTAGE: "Foiz asosida",
} as const;

export const salaryStatusLabels = {
  PENDING: "Kutilmoqda",
  PARTIAL: "Qisman to'langan",
  PAID: "To'langan",
} as const;

export const expenseCategoryLabels = {
  RENT: "Ijara",
  SALARY: "Oylik",
  MARKETING: "Marketing",
  UTILITIES: "Kommunal",
  EQUIPMENT: "Jihoz",
  OTHER: "Boshqa",
} as const;

export const expenseStatusLabels = {
  ACTIVE: "Faol",
  VOID: "Bekor qilingan",
} as const;

export const transactionTypeLabels = {
  INCOME: "Kirim",
  EXPENSE: "Chiqim",
  SALARY: "Oylik to'lovi",
} as const;

export const notificationTypeLabels = {
  STUDENT_ABSENT: "Talaba kelmadi",
  PAYMENT_OVERDUE: "To'lov kechikdi",
  NEW_LEAD: "Yangi lid",
  GROUP_FULL: "Guruh to'ldi",
  SYSTEM_ALERT: "Tizim ogohlantirishi",
  TASK_DUE: "Vazifa muddati",
  LEAD_FOLLOW_UP: "Lid follow-up",
  ATTENDANCE_DROP: "Davomat pasayishi",
} as const;

export const notificationSeverityLabels = {
  INFO: "Info",
  WARNING: "Ogohlantirish",
  CRITICAL: "Kritik",
} as const;

export const taskStatusLabels = {
  TODO: "Yangi",
  IN_PROGRESS: "Jarayonda",
  DONE: "Bajarilgan",
  CANCELLED: "Bekor qilingan",
} as const;

export const taskEntityTypeLabels = {
  LEAD: "Lid",
  STUDENT: "Talaba",
  GROUP: "Guruh",
  PAYMENT: "To'lov",
  ATTENDANCE: "Davomat",
  SYSTEM: "Tizim",
} as const;

export const telegramRecipientLabels = {
  STUDENT: "Talaba",
  PARENT: "Ota-ona",
} as const;

export const telegramMessageTypeLabels = {
  ATTENDANCE_ABSENT: "Davomat (kelmadi)",
  PAYMENT_OVERDUE: "To'lov eslatmasi",
  SYSTEM_ALERT: "Tizim xabari",
} as const;
