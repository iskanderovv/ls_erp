import {
  TelegramDeliveryStatus,
  TelegramMessageType,
  TelegramRecipient,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type SendStudentTelegramInput = {
  studentId: string;
  recipient: TelegramRecipient;
  type: TelegramMessageType;
  createdById?: string | null;
  note?: string | null;
};

export async function sendStudentTelegram(input: SendStudentTelegramInput) {
  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: {
      id: true,
      organizationId: true,
      firstName: true,
      branchId: true,
      telegramChatId: true,
      telegramOptIn: true,
      parentTelegramChatId: true,
      parentTelegramOptIn: true,
    },
  });

  if (!student) {
    throw new Error("Talaba topilmadi.");
  }

  const target =
    input.recipient === "PARENT"
      ? { chatId: student.parentTelegramChatId, optIn: student.parentTelegramOptIn }
      : { chatId: student.telegramChatId, optIn: student.telegramOptIn };

  if (!target.optIn || !target.chatId) {
    const skipped = await prisma.telegramMessage.create({
      data: {
        organizationId: student.organizationId,
        studentId: student.id,
        branchId: student.branchId,
        createdById: input.createdById ?? null,
        recipient: input.recipient,
        type: input.type,
        chatId: target.chatId ?? "unknown",
        message: "Opt-in yoqilmagan yoki chatId yo'q.",
        status: TelegramDeliveryStatus.SKIPPED,
        error: "OPT_IN_REQUIRED",
      },
    });
    return { status: skipped.status };
  }

  const message = buildTelegramMessage({
    type: input.type,
    firstName: student.firstName,
    note: input.note ?? undefined,
  });

  try {
    await sendTelegramMessage(target.chatId, message);
    const sent = await prisma.telegramMessage.create({
      data: {
        organizationId: student.organizationId,
        studentId: student.id,
        branchId: student.branchId,
        createdById: input.createdById ?? null,
        recipient: input.recipient,
        type: input.type,
        chatId: target.chatId,
        message,
        status: TelegramDeliveryStatus.SENT,
      },
    });
    return { status: sent.status };
  } catch (error) {
    const failed = await prisma.telegramMessage.create({
      data: {
        organizationId: student.organizationId,
        studentId: student.id,
        branchId: student.branchId,
        createdById: input.createdById ?? null,
        recipient: input.recipient,
        type: input.type,
        chatId: target.chatId,
        message,
        status: TelegramDeliveryStatus.FAILED,
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
    });
    return { status: failed.status };
  }
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN sozlanmagan.");
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
    cache: "no-store",
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    throw new Error(result?.description ?? "Telegram API xatosi.");
  }
}

function buildTelegramMessage(input: { type: TelegramMessageType; firstName: string; note?: string }) {
  if (input.type === "ATTENDANCE_ABSENT") {
    return `Salom, ${input.firstName}. Bugungi darsda qatnashmadingiz. Iltimos markaz bilan bog'laning.${input.note ? `\nIzoh: ${input.note}` : ""}`;
  }
  if (input.type === "PAYMENT_OVERDUE") {
    return `Salom, ${input.firstName}. To'lov muddati o'tgan. To'lovni tezroq amalga oshiring yoki menejerga murojaat qiling.${input.note ? `\nIzoh: ${input.note}` : ""}`;
  }
  return `Salom, ${input.firstName}. Markazdan muhim xabar bor.${input.note ? `\n${input.note}` : ""}`;
}
