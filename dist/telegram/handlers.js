"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTextMessage = handleTextMessage;
exports.handleVoiceMessage = handleVoiceMessage;
const logger_1 = require("../config/logger");
const voice_1 = require("./voice");
const workflow_1 = require("../core/workflow");
async function handleTextMessage(ctx) {
    const text = ctx.message?.text;
    if (!text)
        return;
    const telegramUserId = String(ctx.from?.id ?? "");
    const chatId = String(ctx.chat?.id ?? "");
    logger_1.logger.info("Received text message", { telegramUserId, chatId, text });
    const reply = await (0, workflow_1.runWorkflow)({
        text,
        telegramUserId,
        chatId,
        isVoice: false,
        voiceMetadata: null,
    });
    await ctx.reply(reply);
}
async function handleVoiceMessage(ctx) {
    const telegramUserId = String(ctx.from?.id ?? "");
    const chatId = String(ctx.chat?.id ?? "");
    logger_1.logger.info("Received voice message", { telegramUserId, chatId });
    const transcription = await (0, voice_1.handleVoiceToText)(ctx);
    if (!transcription) {
        await ctx.reply("Səs mesajını oxumaq mümkün olmadı.");
        return;
    }
    const reply = await (0, workflow_1.runWorkflow)({
        text: transcription.text,
        telegramUserId,
        chatId,
        isVoice: true,
        voiceMetadata: {
            detectedLanguage: transcription.detectedLanguage,
        },
    });
    await ctx.reply(reply);
}
//# sourceMappingURL=handlers.js.map