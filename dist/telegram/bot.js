"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTelegramHandlers = registerTelegramHandlers;
const logger_1 = require("../config/logger");
const handlers_1 = require("./handlers");
const scheduler_1 = require("../jobs/scheduler");
function registerTelegramHandlers(bot) {
    // Make bot available to scheduler for sending reminders
    (0, scheduler_1.registerSchedulerBot)(bot);
    bot.on("message:text", async (ctx) => {
        try {
            await (0, handlers_1.handleTextMessage)(ctx);
        }
        catch (err) {
            logger_1.logger.error("Error handling text message", { err });
            await ctx.reply("Üzr istəyirəm, bir xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.");
        }
    });
    bot.on("message:voice", async (ctx) => {
        try {
            await (0, handlers_1.handleVoiceMessage)(ctx);
        }
        catch (err) {
            logger_1.logger.error("Error handling voice message", { err });
            await ctx.reply("Səs mesajını emal edərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.");
        }
    });
    bot.catch((err) => {
        logger_1.logger.error("Telegram bot error", { err });
    });
}
//# sourceMappingURL=bot.js.map