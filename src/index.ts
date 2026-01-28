import express from "express";
import { Bot } from "grammy";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { registerTelegramHandlers } from "./telegram/bot";
import { registerGoogleAuthRoutes } from "./integrations/googleAuth";
import { startScheduler } from "./jobs/scheduler";

async function main() {
  if (!env.telegramBotToken) {
    logger.warn("TELEGRAM_BOT_TOKEN is not set. Telegram bot will not start.");
  }

  const app = express();
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Google OAuth routes
  registerGoogleAuthRoutes(app);

  // Start Express server
  app.listen(env.port, () => {
    logger.info(`Server listening on http://localhost:${env.port}`);
  });

  // Telegram bot (long polling)
  if (env.telegramBotToken) {
    const bot = new Bot(env.telegramBotToken);
    registerTelegramHandlers(bot);

    bot
      .start()
      .then(() => logger.info("Telegram bot started (long polling)."))
      .catch((err) => logger.error("Failed to start Telegram bot", { err }));
  }

  // Start cron scheduler
  startScheduler();
}

main().catch((err) => {
  logger.error("Fatal error in main()", { err });
  process.exit(1);
});


