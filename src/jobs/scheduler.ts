import cron from "node-cron";
import { Bot } from "grammy";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { getDueReminders, markReminderSent } from "./reminderStore";

let botInstance: Bot | null = null;

export function registerSchedulerBot(bot: Bot) {
  botInstance = bot;
}

export function startScheduler() {
  // every minute
  cron.schedule("* * * * *", async () => {
    try {
      const due = await getDueReminders();
      if (due.length === 0) return;

      if (!botInstance && env.telegramBotToken) {
        // Lazy init bot if not yet available
        // Note: to avoid multiple bots, prefer calling registerSchedulerBot from telegram/bot if possible.
      }

      if (!botInstance) {
        logger.warn(
          "Scheduler has due reminders but no Telegram bot instance is registered.",
        );
        return;
      }

      for (const r of due) {
        try {
          await botInstance.api.sendMessage(r.chatId, r.message);
          await markReminderSent(r.id);
        } catch (err) {
          logger.error("Failed to send scheduled reminder", { err, reminder: r });
        }
      }
    } catch (err) {
      logger.error("Error in reminder scheduler job", { err });
    }
  });
}


