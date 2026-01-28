import axios from "axios";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs-extra";
import path from "path";
import { Context } from "grammy";
import { logger } from "../config/logger";
import { env } from "../config/env";
import { transcribeAudio } from "../ai/llm";

const execFileAsync = promisify(execFile);

function detectAzerbaijani(text: string): "az" | "en" | "unknown" {
  const azChars = /[əığşöüçƏIĞŞÖÜÇ]/;
  if (azChars.test(text)) return "az";
  // crude heuristic: default to unknown; LLM will auto-detect for non-AZ
  return "unknown";
}

export interface VoiceTranscriptionResult {
  text: string;
  detectedLanguage: "az" | "en" | "unknown";
}

export async function handleVoiceToText(ctx: Context): Promise<VoiceTranscriptionResult | null> {
  const voice = ctx.message?.voice;
  if (!voice) return null;

  const fileId = voice.file_id;
  const file = await ctx.api.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${env.telegramBotToken}/${file.file_path}`;

  const tempDir = path.join(process.cwd(), "tmp");
  await fs.ensureDir(tempDir);

  const oggPath = path.join(tempDir, `${fileId}.ogg`);
  const wavPath = path.join(tempDir, `${fileId}.wav`);

  try {
    // Download OGG file
    const response = await axios.get<ArrayBuffer>(fileUrl, {
      responseType: "arraybuffer",
    });
    await fs.writeFile(oggPath, Buffer.from(response.data));

    // Convert to WAV using ffmpeg
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      oggPath,
      "-ac",
      "1",
      "-ar",
      "16000",
      wavPath,
    ]);

    // Transcribe with Whisper
    const rawText = await transcribeAudio(wavPath);
    const detectedLanguage = detectAzerbaijani(rawText);

    return {
      text: rawText,
      detectedLanguage,
    };
  } catch (err) {
    logger.error("Error in handleVoiceToText", { err });
    throw err;
  } finally {
    // cleanup
    try {
      await fs.remove(oggPath);
      await fs.remove(wavPath);
    } catch (cleanupErr) {
      logger.warn("Failed to cleanup temp voice files", { cleanupErr });
    }
  }
}


