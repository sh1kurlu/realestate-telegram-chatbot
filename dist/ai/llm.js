"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = transcribeAudio;
exports.detectIntentAndParse = detectIntentAndParse;
const fs_extra_1 = __importDefault(require("fs-extra"));
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const schemas_1 = require("./schemas");
const openai = new openai_1.default({
    apiKey: env_1.env.openaiApiKey,
});
async function transcribeAudio(wavPath) {
    const file = await fs_extra_1.default.open(wavPath, "r");
    try {
        const stream = fs_extra_1.default.createReadStream("", { fd: file });
        const response = await openai.audio.transcriptions.create({
            file: stream,
            model: "whisper-1",
        });
        return response.text;
    }
    finally {
        await fs_extra_1.default.close(file);
    }
}
async function detectIntentAndParse(options) {
    const { text, vectorContext } = options;
    const systemPrompt = `
You are an AI assistant for a real estate agent working in Azerbaijan.
Your job is to:
1) Detect the user's intent.
2) Extract structured fields from the message.

Intents (exactly one):
- schedule_meeting
- add_client
- send_reminder
- save_buyer_requirements
- unknown

Always respond with STRICT JSON only, matching this TypeScript type:

type ParsedInfo = {
  intent: "schedule_meeting" | "add_client" | "send_reminder" | "save_buyer_requirements" | "unknown";
  clientName?: string | null;
  email?: string | null;
  phone?: string | null;
  meetingDateTime?: string | null; // ISO string in Asia/Baku time
  meetingPurpose?: string | null;
  location?: string | null;
  notes?: string | null;
  propertyPreferences?: {
    rentOrBuy?: string | null;
    budget?: string | null;
    bedrooms?: string | null;
    cityOrNeighborhood?: string | null;
    propertyType?: string | null;
    mustHaves?: string[] | null;
  } | null;
};

Rules:
- Interpret all relative dates in timezone Asia/Baku.
- If information is not clearly provided, set the corresponding field to null.
- Do NOT invent specific personal data if not mentioned.
- If the user refers to "same client", "same budget", or similar, use the context provided below.
`;
    const contextSection = vectorContext
        ? `\nRelevant past context (from previous voice messages by this user):\n${vectorContext}\n`
        : "";
    const userPrompt = `
User message:
${text}
${contextSection}

Return ONLY JSON, no explanation, no markdown.
`;
    const completion = await openai.chat.completions.create({
        model: env_1.env.openaiModel,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    try {
        const parsed = JSON.parse(raw);
        const validated = schemas_1.ParsedInfoSchema.parse(parsed);
        return validated;
    }
    catch (err) {
        logger_1.logger.error("Failed to parse LLM JSON", { raw, err });
        // Fallback: unknown intent
        const fallback = {
            intent: "unknown",
            clientName: null,
            email: null,
            phone: null,
            meetingDateTime: null,
            meetingPurpose: null,
            location: null,
            notes: null,
            propertyPreferences: null,
        };
        return fallback;
    }
}
//# sourceMappingURL=llm.js.map