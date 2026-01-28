import { Bot, Context } from "grammy";
import { logger } from "../config/logger";
import { handleTextMessage, handleVoiceMessage } from "./handlers";
import { registerSchedulerBot } from "../jobs/scheduler";

export function registerTelegramHandlers(bot: Bot<Context>) {
  // Make bot available to scheduler for sending reminders
  registerSchedulerBot(bot);

  bot.on("message:text", async (ctx) => {
    try {
      await handleTextMessage(ctx);
    } catch (err) {
      logger.error("Error handling text message", { err });
      await ctx.reply("Üzr istəyirəm, bir xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.");
    }
  });

  bot.on("message:voice", async (ctx) => {
    try {
      await handleVoiceMessage(ctx);
    } catch (err) {
      logger.error("Error handling voice message", { err });
      await ctx.reply("Səs mesajını emal edərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.");
    }
  });

  bot.catch((err) => {
    logger.error("Telegram bot error", { err });
  });
}


