import { Context } from "grammy";
import { logger } from "../config/logger";
import { handleVoiceToText } from "./voice";
import { runWorkflow } from "../core/workflow";

export async function handleTextMessage(ctx: Context) {
  const text = ctx.message?.text;
  if (!text) return;

  // Special-case /start to provide a friendly welcome message without requiring OpenAI.
  if (text.trim() === "/start") {
    await ctx.reply(
      "👋 Salam! Mən daşınmaz əmlak üzrə AI asistentəm.\n\n" +
        "Mən sizə kömək edə bilərəm:\n" +
        "🏠 Müştəri məlumatlarını əlavə etmək\n" +
        "📅 Görüşlər təyin etmək\n" +
        "📝 Alıcı tələblərini yadda saxlamaq\n" +
        "🔔 Xatırlatmalar yaratmaq\n\n" +
        "Sadəcə səs və ya mətn ilə nə etmək istədiyinizi yazın, məsələn:\n" +
        "• \"Sabah saat 3-də Nigar xanımla görüş təyin et\"\n" +
        "• \"Yeni alıcı əlavə et, büdcə 150.000 AZN\"\n" +
        "• \"Eyni müştəri üçün eyni büdcə qalsın\""
    );
    return;
  }

  const telegramUserId = String(ctx.from?.id ?? "");
  const chatId = String(ctx.chat?.id ?? "");

  logger.info("Received text message", { telegramUserId, chatId, text });

  const reply = await runWorkflow({
    text,
    telegramUserId,
    chatId,
    isVoice: false,
    voiceMetadata: null,
  });

  await ctx.reply(reply);
}

export async function handleVoiceMessage(ctx: Context) {
  const telegramUserId = String(ctx.from?.id ?? "");
  const chatId = String(ctx.chat?.id ?? "");

  logger.info("Received voice message", { telegramUserId, chatId });

  const transcription = await handleVoiceToText(ctx);
  if (!transcription) {
    await ctx.reply("Səs mesajını oxumaq mümkün olmadı.");
    return;
  }

  const reply = await runWorkflow({
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


