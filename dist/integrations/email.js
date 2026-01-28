"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMeetingReminderEmail = sendMeetingReminderEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const transporter = env_1.env.smtpHost && env_1.env.smtpUser && env_1.env.smtpPass
    ? nodemailer_1.default.createTransport({
        host: env_1.env.smtpHost,
        port: env_1.env.smtpPort,
        secure: env_1.env.smtpPort === 465,
        auth: {
            user: env_1.env.smtpUser,
            pass: env_1.env.smtpPass,
        },
    })
    : null;
async function sendMeetingReminderEmail(input) {
    if (!transporter) {
        logger_1.logger.warn("SMTP not configured, skipping email send");
        return;
    }
    const subject = `Reminder: Meeting scheduled on ${input.meetingDateTime} with ${env_1.env.agentName}`;
    const body = `Salam,\n\nBu, ${env_1.env.agentName} ilə görüş xatırlatmasıdır.\n\nTarix və vaxt: ${input.meetingDateTime}\nMəkan: ${input.location ?? "—"}\n\nGörüşə qədər hər hansı sualınız olarsa, bizimlə əlaqə saxlaya bilərsiniz.\n\nHörmətlə,\n${env_1.env.agentName}`;
    await transporter.sendMail({
        from: env_1.env.smtpUser,
        to: input.to,
        subject,
        text: body,
    });
}
//# sourceMappingURL=email.js.map