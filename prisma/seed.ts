import {
  AttendanceStatus,
  BranchStatus,
  GroupStatus,
  LeadSource,
  LeadStatus,
  PaymentMethod,
  PrismaClient,
  Role,
  StudentFeeStatus,
  StudentStatus,
  TeacherStatus,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.paymentReminder.deleteMany();
  await prisma.telegramMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.financialTransaction.deleteMany();
  await prisma.salaryPayment.deleteMany();
  await prisma.salaryRecord.deleteMany();
  await prisma.teacherSalaryConfig.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.studentFee.deleteMany();
  await prisma.groupStudent.deleteMany();
  await prisma.studyGroup.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  const chilonzorBranch = await prisma.branch.create({
    data: {
      name: "Chilonzor filiali",
      phone: "+998901112233",
      address: "Chilonzor tumani, 12-kvartal",
      landmark: "Metro Chilonzor yonida",
      status: BranchStatus.ACTIVE,
    },
  });

  const yunusobodBranch = await prisma.branch.create({
    data: {
      name: "Yunusobod filiali",
      phone: "+998901234567",
      address: "Yunusobod tumani, 4-mavze",
      landmark: "Mega Planet yaqinida",
      status: BranchStatus.ACTIVE,
    },
  });

  const passwordHash = await bcrypt.hash("Admin12345!", 12);

  const superAdmin = await prisma.user.create({
    data: {
      firstName: "Super",
      lastName: "Admin",
      phone: "+998900000001",
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const manager = await prisma.user.create({
    data: {
      firstName: "Aziza",
      lastName: "Manager",
      phone: "+998900000002",
      passwordHash,
      role: Role.MANAGER,
      status: UserStatus.ACTIVE,
      branchId: chilonzorBranch.id,
    },
  });

  const admin = await prisma.user.create({
    data: {
      firstName: "Anvar",
      lastName: "Admin",
      phone: "+998900000003",
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      branchId: chilonzorBranch.id,
    },
  });

  await prisma.user.create({
    data: {
      firstName: "Dilshod",
      lastName: "Teacher",
      phone: "+998900000004",
      passwordHash,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
      branchId: chilonzorBranch.id,
    },
  });

  const accountant = await prisma.user.create({
    data: {
      firstName: "Malika",
      lastName: "Accountant",
      phone: "+998900000005",
      passwordHash,
      role: Role.ACCOUNTANT,
      status: UserStatus.ACTIVE,
      branchId: yunusobodBranch.id,
    },
  });

  const englishTeacher = await prisma.teacher.create({
    data: {
      firstName: "Dildora",
      lastName: "Xolmatova",
      phone: "+998911234567",
      specialtySubjects: ["IELTS", "General English"],
      branchId: chilonzorBranch.id,
      status: TeacherStatus.ACTIVE,
      hiredAt: new Date("2024-09-01"),
    },
  });

  const mathTeacher = await prisma.teacher.create({
    data: {
      firstName: "Bekzod",
      lastName: "Karimov",
      phone: "+998935551122",
      specialtySubjects: ["Matematika", "SAT Math"],
      branchId: yunusobodBranch.id,
      status: TeacherStatus.ACTIVE,
      hiredAt: new Date("2024-11-10"),
    },
  });

  const studentOne = await prisma.student.create({
    data: {
      firstName: "Jasur",
      lastName: "Olimov",
      phone: "+998901111111",
      parentPhone: "+998907777777",
      status: StudentStatus.ACTIVE,
      branchId: chilonzorBranch.id,
      schoolName: "42-maktab",
      gradeLevel: "11-sinf",
      targetExamYear: 2026,
      telegramChatId: "123456789",
      telegramOptIn: true,
    },
  });

  const studentTwo = await prisma.student.create({
    data: {
      firstName: "Mohira",
      lastName: "Aliyeva",
      phone: "+998902222222",
      status: StudentStatus.ACTIVE,
      branchId: yunusobodBranch.id,
      schoolName: "81-maktab",
      gradeLevel: "10-sinf",
      targetExamYear: 2027,
      parentTelegramChatId: "987654321",
      parentTelegramOptIn: true,
    },
  });

  const ieltsGroup = await prisma.studyGroup.create({
    data: {
      name: "IELTS Evening 01",
      subject: "IELTS",
      teacherId: englishTeacher.id,
      branchId: chilonzorBranch.id,
      room: "301",
      startDate: new Date("2026-01-15"),
      status: GroupStatus.ACTIVE,
      notes: "Dushanba-Chorshanba-Juma",
      maxStudents: 20,
    },
  });

  const satGroup = await prisma.studyGroup.create({
    data: {
      name: "SAT Math Weekend",
      subject: "SAT Math",
      teacherId: mathTeacher.id,
      branchId: yunusobodBranch.id,
      room: "205",
      startDate: new Date("2026-02-01"),
      status: GroupStatus.FORMING,
      maxStudents: 20,
    },
  });

  await prisma.groupStudent.createMany({
    data: [
      {
        groupId: ieltsGroup.id,
        studentId: studentOne.id,
      },
      {
        groupId: satGroup.id,
        studentId: studentTwo.id,
      },
    ],
  });

  await prisma.studentFee.createMany({
    data: [
      {
        studentId: studentOne.id,
        groupId: ieltsGroup.id,
        branchId: chilonzorBranch.id,
        monthlyFeeCents: 80000000,
        startDate: new Date("2026-01-01"),
        status: StudentFeeStatus.ACTIVE,
      },
      {
        studentId: studentTwo.id,
        groupId: satGroup.id,
        branchId: yunusobodBranch.id,
        monthlyFeeCents: 75000000,
        startDate: new Date("2026-01-01"),
        status: StudentFeeStatus.ACTIVE,
      },
    ],
  });

  await prisma.payment.createMany({
    data: [
      {
        studentId: studentOne.id,
        groupId: ieltsGroup.id,
        branchId: chilonzorBranch.id,
        amountCents: 80000000,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2026-01-05"),
        createdById: admin.id,
      },
      {
        studentId: studentOne.id,
        groupId: ieltsGroup.id,
        branchId: chilonzorBranch.id,
        amountCents: 40000000,
        paymentMethod: PaymentMethod.CLICK,
        paidAt: new Date("2026-02-07"),
        createdById: accountant.id,
      },
      {
        studentId: studentTwo.id,
        groupId: satGroup.id,
        branchId: yunusobodBranch.id,
        amountCents: 75000000,
        paymentMethod: PaymentMethod.CARD,
        paidAt: new Date("2026-01-10"),
        createdById: accountant.id,
      },
    ],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.attendance.createMany({
    data: [
      {
        studentId: studentOne.id,
        groupId: ieltsGroup.id,
        date: today,
        status: AttendanceStatus.PRESENT,
      },
      {
        studentId: studentTwo.id,
        groupId: satGroup.id,
        date: today,
        status: AttendanceStatus.LATE,
      },
      {
        studentId: studentOne.id,
        groupId: ieltsGroup.id,
        date: yesterday,
        status: AttendanceStatus.ABSENT,
      },
      {
        studentId: studentTwo.id,
        groupId: satGroup.id,
        date: yesterday,
        status: AttendanceStatus.PRESENT,
      },
    ],
  });

  await prisma.paymentReminder.createMany({
    data: [
      {
        studentId: studentOne.id,
        groupId: ieltsGroup.id,
        branchId: chilonzorBranch.id,
        note: "Fevral oylik to'lovi bo'yicha eslatma.",
        sentById: manager.id,
      },
    ],
  });

  await prisma.lead.createMany({
    data: [
      {
        firstName: "Shohruh",
        lastName: "Nazarov",
        phone: "+998909998877",
        source: LeadSource.TELEGRAM,
        interestedSubject: "IELTS",
        status: LeadStatus.NEW,
        branchId: chilonzorBranch.id,
        assignedToId: manager.id,
        followUpDueAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        firstName: "Sevara",
        phone: "+998900101010",
        source: LeadSource.REFERRAL,
        interestedSubject: "Matematika",
        status: LeadStatus.CONTACTED,
        branchId: yunusobodBranch.id,
        followUpDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Shohruh lidiga qo'ng'iroq qilish",
        description: "Follow-up muddatidan o'tib ketgan.",
        assignedToId: manager.id,
        createdById: admin.id,
        branchId: chilonzorBranch.id,
        relatedEntityType: "LEAD",
        status: "TODO",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        title: "Jasur bilan davomat bo'yicha bog'lanish",
        assignedToId: manager.id,
        createdById: admin.id,
        branchId: chilonzorBranch.id,
        relatedEntityType: "ATTENDANCE",
        relatedEntityId: studentOne.id,
        status: "IN_PROGRESS",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: manager.id,
        branchId: chilonzorBranch.id,
        type: "NEW_LEAD",
        severity: "INFO",
        title: "Yangi lid biriktirildi",
        message: "Shohruh Nazarov uchun follow-up qiling.",
        link: "/dashboard/leads",
      },
      {
        userId: admin.id,
        branchId: chilonzorBranch.id,
        type: "PAYMENT_OVERDUE",
        severity: "WARNING",
        title: "Qarz eslatmasi",
        message: "Jasur Olimov to'lovi qisman qolgan.",
        link: "/dashboard/debts",
      },
    ],
  });

  console.log("Seed completed.");
  console.log("Test login:");
  console.log("Phone: +998900000001");
  console.log("Password: Admin12345!");
  console.log(`Super admin ID: ${superAdmin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
