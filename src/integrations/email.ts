import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../config/logger";

const transporter =
  env.smtpHost && env.smtpUser && env.smtpPass
    ? nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      })
    : null;

export interface MeetingReminderEmailInput {
  to: string;
  meetingDateTime: string;
  location?: string | null;
}

export async function sendMeetingReminderEmail(
  input: MeetingReminderEmailInput,
): Promise<void> {
  if (!transporter) {
    logger.warn("SMTP not configured, skipping email send");
    return;
  }

  const subject = `Reminder: Meeting scheduled on ${input.meetingDateTime} with ${env.agentName}`;
  const body = `Salam,\n\nBu, ${env.agentName} ilə görüş xatırlatmasıdır.\n\nTarix və vaxt: ${input.meetingDateTime}\nMəkan: ${
    input.location ?? "—"
  }\n\nGörüşə qədər hər hansı sualınız olarsa, bizimlə əlaqə saxlaya bilərsiniz.\n\nHörmətlə,\n${env.agentName}`;

  await transporter.sendMail({
    from: env.smtpUser,
    to: input.to,
    subject,
    text: body,
  });
}


