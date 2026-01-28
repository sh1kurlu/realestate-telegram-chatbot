import fs from "fs-extra";
import path from "path";
import OpenAI from "openai";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { ParsedInfo, ParsedInfoSchema, Intent } from "./schemas";

const openai = new OpenAI({
  apiKey: env.openaiApiKey,
});

export async function transcribeAudio(wavPath: string): Promise<string> {
  const stream = fs.createReadStream(wavPath);
  const response = await openai.audio.transcriptions.create({
    file: stream,
    model: "whisper-1",
  });
  return response.text;
}

export interface IntentAndParseOptions {
  text: string;
  vectorContext?: string | null;
}

export async function detectIntentAndParse(
  options: IntentAndParseOptions,
): Promise<ParsedInfo> {
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
    model: env.openaiModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw);
    const validated = ParsedInfoSchema.parse(parsed);
    return validated;
  } catch (err) {
    logger.error("Failed to parse LLM JSON", { raw, err });
    // Fallback: unknown intent
    const fallback: ParsedInfo = {
      intent: "unknown" as Intent,
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


