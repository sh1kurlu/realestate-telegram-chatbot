"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleVoiceToText = handleVoiceToText;
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const llm_1 = require("../ai/llm");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
function detectAzerbaijani(text) {
    const azChars = /[əığşöüçƏIĞŞÖÜÇ]/;
    if (azChars.test(text))
        return "az";
    // crude heuristic: default to unknown; LLM will auto-detect for non-AZ
    return "unknown";
}
async function handleVoiceToText(ctx) {
    const voice = ctx.message?.voice;
    if (!voice)
        return null;
    const fileId = voice.file_id;
    const file = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${env_1.env.telegramBotToken}/${file.file_path}`;
    const tempDir = path_1.default.join(process.cwd(), "tmp");
    await fs_extra_1.default.ensureDir(tempDir);
    const oggPath = path_1.default.join(tempDir, `${fileId}.ogg`);
    const wavPath = path_1.default.join(tempDir, `${fileId}.wav`);
    try {
        // Download OGG file
        const response = await axios_1.default.get(fileUrl, {
            responseType: "arraybuffer",
        });
        await fs_extra_1.default.writeFile(oggPath, Buffer.from(response.data));
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
        const rawText = await (0, llm_1.transcribeAudio)(wavPath);
        const detectedLanguage = detectAzerbaijani(rawText);
        return {
            text: rawText,
            detectedLanguage,
        };
    }
    catch (err) {
        logger_1.logger.error("Error in handleVoiceToText", { err });
        throw err;
    }
    finally {
        // cleanup
        try {
            await fs_extra_1.default.remove(oggPath);
            await fs_extra_1.default.remove(wavPath);
        }
        catch (cleanupErr) {
            logger_1.logger.warn("Failed to cleanup temp voice files", { cleanupErr });
        }
    }
}
//# sourceMappingURL=voice.js.map