"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const grammy_1 = require("grammy");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const bot_1 = require("./telegram/bot");
const googleAuth_1 = require("./integrations/googleAuth");
const scheduler_1 = require("./jobs/scheduler");
async function main() {
    if (!env_1.env.telegramBotToken) {
        logger_1.logger.warn("TELEGRAM_BOT_TOKEN is not set. Telegram bot will not start.");
    }
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Health check
    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });
    // Google OAuth routes
    (0, googleAuth_1.registerGoogleAuthRoutes)(app);
    // Start Express server
    app.listen(env_1.env.port, () => {
        logger_1.logger.info(`Server listening on http://localhost:${env_1.env.port}`);
    });
    // Telegram bot (long polling)
    if (env_1.env.telegramBotToken) {
        const bot = new grammy_1.Bot(env_1.env.telegramBotToken);
        (0, bot_1.registerTelegramHandlers)(bot);
        bot
            .start()
            .then(() => logger_1.logger.info("Telegram bot started (long polling)."))
            .catch((err) => logger_1.logger.error("Failed to start Telegram bot", { err }));
    }
    // Start cron scheduler
    (0, scheduler_1.startScheduler)();
}
main().catch((err) => {
    logger_1.logger.error("Fatal error in main()", { err });
    process.exit(1);
});
//# sourceMappingURL=index.js.map