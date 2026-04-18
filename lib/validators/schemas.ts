import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(9, "Telefon raqamini kiriting.")
  .max(20, "Telefon raqami juda uzun.");

const optionalText = z
  .string()
  .trim()
  .max(500, "Matn juda uzun.")
  .optional()
  .or(z.literal(""));

const optionalShortText = z
  .string()
  .trim()
  .max(120, "Matn juda uzun.")
  .optional()
  .or(z.literal(""));

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana formati noto'g'ri.")
  .optional()
  .or(z.literal(""));

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak."),
});

export const branchSchema = z.object({
  name: z.string().trim().min(2, "Nomi kamida 2 ta belgidan iborat bo'lishi kerak."),
  phone: phoneSchema,
  address: z.string().trim().min(4, "Manzilni kiriting."),
  landmark: optionalShortText,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const studentSchema = z.object({
  firstName: z.string().trim().min(2, "Ism majburiy."),
  lastName: z.string().trim().min(2, "Familiya majburiy."),
  phone: phoneSchema,
  parentPhone: phoneSchema.optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  birthDate: optionalDate,
  schoolName: optionalShortText,
  gradeLevel: optionalShortText,
  targetExamYear: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce
      .number()
      .int()
      .min(2025, "Yil noto'g'ri.")
      .max(2100, "Yil noto'g'ri.")
      .optional(),
  ),
  notes: optionalText,
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
  branchId: z.string().trim().min(1, "Filialni tanlang."),
});

export const leadSchema = z.object({
  firstName: z.string().trim().min(2, "Ism majburiy."),
  lastName: optionalShortText,
  phone: phoneSchema,
  source: z.enum(["TELEGRAM", "INSTAGRAM", "REFERRAL", "CALL", "WALK_IN", "OTHER"]),
  interestedSubject: optionalShortText,
  status: z.enum(["NEW", "CONTACTED", "TRIAL_LESSON", "CONVERTED", "LOST"]),
  notes: optionalText,
  branchId: z.string().trim().min(1, "Filialni tanlang."),
  assignedToId: z.string().optional().or(z.literal("")),
});

export const teacherSchema = z.object({
  firstName: z.string().trim().min(2, "Ism majburiy."),
  lastName: z.string().trim().min(2, "Familiya majburiy."),
  phone: phoneSchema,
  specialtySubjects: z
    .string()
    .trim()
    .min(2, "Kamida bitta fan kiriting (vergul bilan ajrating)."),
  branchId: z.string().trim().min(1, "Filialni tanlang."),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  hiredAt: optionalDate,
  notes: optionalText,
});

export const groupSchema = z.object({
  name: z.string().trim().min(2, "Guruh nomi majburiy."),
  subject: z.string().trim().min(2, "Fan nomi majburiy."),
  teacherId: z.string().optional().or(z.literal("")),
  branchId: z.string().trim().min(1, "Filialni tanlang."),
  room: optionalShortText,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Boshlanish sanasini kiriting."),
  status: z.enum(["FORMING", "ACTIVE", "COMPLETED", "ARCHIVED"]),
  notes: optionalText,
});

export const leadConvertSchema = z.object({
  branchId: z.string().trim().min(1, "Filial kerak."),
});

export const groupStudentAttachSchema = z.object({
  studentId: z.string().trim().min(1, "Talabani tanlang."),
});

export const attendanceEntrySchema = z.object({
  studentId: z.string().trim().min(1, "Talaba tanlanmagan."),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
  note: optionalText,
});

export const attendanceSaveSchema = z.object({
  groupId: z.string().trim().min(1, "Guruhni tanlang."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana noto'g'ri."),
  entries: z.array(attendanceEntrySchema).min(1, "Kamida bitta talaba bo'lishi kerak."),
});

export const paymentSchema = z.object({
  studentId: z.string().trim().min(1, "Talabani tanlang."),
  groupId: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Summa 0 dan katta bo'lishi kerak.").max(1000000000),
  paymentMethod: z.enum(["CASH", "CARD", "CLICK", "PAYME", "OTHER"]),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana noto'g'ri."),
  note: optionalText,
});

export const studentFeeSchema = z.object({
  studentId: z.string().trim().min(1, "Talabani tanlang."),
  groupId: z.string().trim().min(1, "Guruhni tanlang."),
  monthlyFee: z.coerce.number().positive("Oylik summa 0 dan katta bo'lishi kerak."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Boshlanish sanasi noto'g'ri."),
  endDate: optionalDate,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const paymentReminderSchema = z.object({
  studentId: z.string().trim().min(1, "Talabani tanlang."),
  groupId: z.string().optional().or(z.literal("")),
  note: optionalText,
});

export const salaryConfigSchema = z
  .object({
    teacherId: z.string().trim().min(1, "Ustozni tanlang."),
    type: z.enum(["FIXED", "PER_STUDENT", "PER_GROUP", "PERCENTAGE"]),
    unitAmount: z.coerce.number().min(0).optional(),
    percentage: z.coerce.number().min(0).max(100).optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana noto'g'ri."),
    effectiveTo: optionalDate,
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.type === "PERCENTAGE") {
      if (value.percentage === undefined || value.percentage <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["percentage"],
          message: "Foiz qiymati 0 dan katta bo'lishi kerak.",
        });
      }
      return;
    }
    if (value.unitAmount === undefined || value.unitAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitAmount"],
        message: "Qiymat 0 dan katta bo'lishi kerak.",
      });
    }
  });

export const salaryCalculateSchema = z.object({
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2020).max(2200),
  teacherId: z.string().optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
});

export const salaryPaymentSchema = z.object({
  amount: z.coerce.number().positive("To'lov summasi 0 dan katta bo'lishi kerak."),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana noto'g'ri."),
  note: optionalText,
});

export const expenseSchema = z.object({
  title: z.string().trim().min(2, "Nomi majburiy."),
  amount: z.coerce.number().positive("Summa 0 dan katta bo'lishi kerak."),
  category: z.enum(["RENT", "SALARY", "MARKETING", "UTILITIES", "EQUIPMENT", "OTHER"]),
  branchId: z.string().trim().min(1, "Filialni tanlang."),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana noto'g'ri."),
  note: optionalText,
});

export const notificationReadSchema = z
  .object({
    id: z.string().trim().optional(),
    markAll: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.id || value.markAll), {
    message: "Bildirishnoma ID yoki markAll talab qilinadi.",
  });

export const taskCreateSchema = z.object({
  title: z.string().trim().min(2, "Sarlavha majburiy."),
  description: optionalText,
  assignedToId: z.string().trim().min(1, "Mas'ul xodimni tanlang."),
  branchId: z.string().trim().min(1, "Filialni tanlang."),
  relatedEntityType: z
    .enum(["LEAD", "STUDENT", "GROUP", "PAYMENT", "ATTENDANCE", "SYSTEM"])
    .optional()
    .or(z.literal("")),
  relatedEntityId: z.string().trim().optional().or(z.literal("")),
  dueDate: optionalDate,
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(2, "Sarlavha majburiy.").optional(),
  description: optionalText,
  assignedToId: z.string().trim().min(1, "Mas'ul xodimni tanlang.").optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  dueDate: optionalDate,
});

export const telegramSendSchema = z.object({
  studentId: z.string().trim().min(1, "Talabani tanlang."),
  recipient: z.enum(["STUDENT", "PARENT"]),
  type: z.enum(["ATTENDANCE_ABSENT", "PAYMENT_OVERDUE", "SYSTEM_ALERT"]),
  note: optionalText,
});

export const automationRunSchema = z.object({
  runDebts: z.boolean().optional().default(true),
  runAttendance: z.boolean().optional().default(true),
  runLeads: z.boolean().optional().default(true),
  runAlerts: z.boolean().optional().default(true),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type BranchFormValues = z.infer<typeof branchSchema>;
export type StudentFormValues = z.infer<typeof studentSchema>;
export type LeadFormValues = z.infer<typeof leadSchema>;
export type TeacherFormValues = z.infer<typeof teacherSchema>;
export type GroupFormValues = z.infer<typeof groupSchema>;
export type AttendanceSaveValues = z.infer<typeof attendanceSaveSchema>;
export type PaymentFormValues = z.infer<typeof paymentSchema>;
export type StudentFeeFormValues = z.infer<typeof studentFeeSchema>;
export type SalaryConfigFormValues = z.infer<typeof salaryConfigSchema>;
export type SalaryPaymentFormValues = z.infer<typeof salaryPaymentSchema>;
export type ExpenseFormValues = z.infer<typeof expenseSchema>;
export type TaskCreateFormValues = z.infer<typeof taskCreateSchema>;
export type TaskUpdateFormValues = z.infer<typeof taskUpdateSchema>;
