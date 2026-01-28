"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSchedulerBot = registerSchedulerBot;
exports.startScheduler = startScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const reminderStore_1 = require("./reminderStore");
let botInstance = null;
function registerSchedulerBot(bot) {
    botInstance = bot;
}
function startScheduler() {
    // every minute
    node_cron_1.default.schedule("* * * * *", async () => {
        try {
            const due = await (0, reminderStore_1.getDueReminders)();
            if (due.length === 0)
                return;
            if (!botInstance && env_1.env.telegramBotToken) {
                // Lazy init bot if not yet available
                // Note: to avoid multiple bots, prefer calling registerSchedulerBot from telegram/bot if possible.
            }
            if (!botInstance) {
                logger_1.logger.warn("Scheduler has due reminders but no Telegram bot instance is registered.");
                return;
            }
            for (const r of due) {
                try {
                    await botInstance.api.sendMessage(r.chatId, r.message);
                    await (0, reminderStore_1.markReminderSent)(r.id);
                }
                catch (err) {
                    logger_1.logger.error("Failed to send scheduled reminder", { err, reminder: r });
                }
            }
        }
        catch (err) {
            logger_1.logger.error("Error in reminder scheduler job", { err });
        }
    });
}
//# sourceMappingURL=scheduler.js.map