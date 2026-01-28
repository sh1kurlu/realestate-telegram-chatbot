import { normalizeText, NormalizedMessage } from "./normalize";
import { detectIntentAndParse } from "../ai/llm";
import { queryVoiceContext, storeVoiceVector } from "../vector";
import { validateParsedInfo } from "./validation";
import {
  clearConversationState,
  getConversationState,
  setConversationState,
} from "./state";
import { appendCrmRow, upsertBuyerRequirements } from "../integrations/sheets";
import { createCalendarEvent } from "../integrations/calendar";
import { sendMeetingReminderEmail } from "../integrations/email";
import { env } from "../config/env";
import { ensureBakuIso } from "./time";
import { isMeetingIntent, requiresBuyerRequirements } from "./intents";
import { logger } from "../config/logger";

export interface WorkflowInput {
  text: string;
  telegramUserId: string;
  chatId: string;
  isVoice: boolean;
  voiceMetadata: {
    detectedLanguage: "az" | "en" | "unknown";
  } | null;
}

export async function runWorkflow(input: WorkflowInput): Promise<string> {
  const normalized: NormalizedMessage = {
    text: normalizeText(input.text),
    telegramUserId: input.telegramUserId,
    chatId: input.chatId,
    isVoice: input.isVoice,
    voiceLanguage: input.voiceMetadata?.detectedLanguage,
  };

  const keyState = getConversationState(
    normalized.telegramUserId,
    normalized.chatId,
  );
  if (keyState && keyState.awaitingFields && keyState.awaitingFields.length) {
    // Simple follow-up: treat this message as providing missing info.
    // For MVP, we re-run parsing but keep previous data as fallback.
    logger.info("Handling follow-up message for missing fields");
  }

  let vectorContext: string | null = null;
  if (normalized.isVoice) {
    try {
      vectorContext = await queryVoiceContext({
        text: normalized.text,
        telegramUserId: normalized.telegramUserId,
      });
    } catch (err) {
      logger.error("Failed to query voice vector context", { err });
    }
  }

  const parsed = await detectIntentAndParse({
    text: normalized.text,
    vectorContext,
  });

  const validation = validateParsedInfo(parsed);

  // If missing required fields, ask a clarifying question and store state.
  if (validation.missingFields.length > 0) {
    setConversationState(normalized.telegramUserId, normalized.chatId, {
      lastParsedInfo: parsed,
      awaitingFields: validation.missingFields,
    });

    const missingList = validation.missingFields
      .map((f) => `- ${f}`)
      .join("\n");
    return `Daha dəqiq davam etmək üçün aşağıdakı məlumatlar çatışmır:\n${missingList}\n\nZəhmət olmasa bu məlumatları göndərin.`;
  }

  // No missing fields: clear state
  clearConversationState(normalized.telegramUserId, normalized.chatId);

  // Voice vectors: store for future context
  if (normalized.isVoice) {
    try {
      await storeVoiceVector({
        text: normalized.text,
        telegramUserId: normalized.telegramUserId,
        chatId: normalized.chatId,
        detectedLanguage: normalized.voiceLanguage ?? "unknown",
        detectedIntent: parsed.intent,
        clientName: parsed.clientName ?? undefined,
        meetingDateTime: parsed.meetingDateTime ?? undefined,
      });
    } catch (err) {
      logger.error("Failed to store voice vector", { err });
    }
  }

  // Write to Google Sheets CRM
  await appendCrmRow({
    clientName: parsed.clientName,
    email: parsed.email,
    phone: parsed.phone,
    meetingDateTime: parsed.meetingDateTime
      ? ensureBakuIso(parsed.meetingDateTime)
      : null,
    meetingPurpose: parsed.meetingPurpose,
    location: parsed.location,
    budget: parsed.propertyPreferences?.budget ?? null,
    rentOrBuy: parsed.propertyPreferences?.rentOrBuy ?? null,
    bedrooms: parsed.propertyPreferences?.bedrooms ?? null,
    propertyType: parsed.propertyPreferences?.propertyType ?? null,
    preferredLocations: parsed.propertyPreferences?.cityOrNeighborhood ?? null,
    mustHaves: parsed.propertyPreferences?.mustHaves?.join(", ") ?? null,
    notes: parsed.notes,
    rawMessage: normalized.text,
  });

  // Buyer requirements tab
  if (requiresBuyerRequirements(parsed.intent)) {
    await upsertBuyerRequirements({
      clientName: parsed.clientName,
      contact:
        parsed.email ||
        parsed.phone ||
        normalized.telegramUserId ||
        normalized.chatId,
      rentOrBuy: parsed.propertyPreferences?.rentOrBuy ?? null,
      budget: parsed.propertyPreferences?.budget ?? null,
      bedrooms: parsed.propertyPreferences?.bedrooms ?? null,
      locations: parsed.propertyPreferences?.cityOrNeighborhood ?? null,
      propertyType: parsed.propertyPreferences?.propertyType ?? null,
      mustHaves: parsed.propertyPreferences?.mustHaves?.join(", ") ?? null,
      notes: parsed.notes ?? null,
    });
  }

  // Calendar + email
  let calendarEventId: string | null = null;
  if (isMeetingIntent(parsed.intent) && parsed.meetingDateTime) {
    const startIso = ensureBakuIso(parsed.meetingDateTime);
    // For MVP, set end time +1 hour
    const endIso = new Date(
      new Date(startIso).getTime() + 60 * 60 * 1000,
    ).toISOString();

    const summary = `Meeting with ${parsed.clientName ?? "client"}`;
    const description = `Purpose: ${
      parsed.meetingPurpose ?? ""
    }\nLocation: ${parsed.location ?? ""}\nNotes: ${
      parsed.notes ?? ""
    }\nOriginal message:\n${normalized.text}`;

    calendarEventId = await createCalendarEvent({
      summary,
      description,
      startDateTime: startIso,
      endDateTime: endIso,
      attendeeEmail: parsed.email ?? null,
    });

    if (parsed.email) {
      await sendMeetingReminderEmail({
        to: parsed.email,
        meetingDateTime: startIso,
        location: parsed.location,
      });
    }
  }

  // Build human-friendly summary
  const intentLabel = (() => {
    switch (parsed.intent) {
      case "schedule_meeting":
        return "Görüş təyin olundu";
      case "add_client":
        return "Müştəri əlavə olundu";
      case "send_reminder":
        return "Xatırlatma yaradıldı";
      case "save_buyer_requirements":
        return "Alıcı tələbləri yadda saxlanıldı";
      default:
        return "Məlumat emal olundu";
    }
  })();

  const lines: string[] = [];
  lines.push(`**${intentLabel}**`);
  if (parsed.clientName) lines.push(`Müştəri: ${parsed.clientName}`);
  if (parsed.phone) lines.push(`Telefon: ${parsed.phone}`);
  if (parsed.email) lines.push(`Email: ${parsed.email}`);
  if (parsed.meetingDateTime)
    lines.push(`Görüş vaxtı: ${ensureBakuIso(parsed.meetingDateTime)}`);
  if (parsed.location) lines.push(`Məkan: ${parsed.location}`);
  if (parsed.propertyPreferences?.rentOrBuy)
    lines.push(`Tip: ${parsed.propertyPreferences.rentOrBuy}`);
  if (parsed.propertyPreferences?.budget)
    lines.push(`Büdcə: ${parsed.propertyPreferences.budget}`);
  if (parsed.propertyPreferences?.bedrooms)
    lines.push(`Otaq sayı: ${parsed.propertyPreferences.bedrooms}`);
  if (parsed.propertyPreferences?.cityOrNeighborhood)
    lines.push(
      `Rayon/Şəhər: ${parsed.propertyPreferences.cityOrNeighborhood}`,
    );
  if (parsed.propertyPreferences?.propertyType)
    lines.push(`Əmlak növü: ${parsed.propertyPreferences.propertyType}`);
  if (parsed.propertyPreferences?.mustHaves?.length)
    lines.push(
      `Vacib xüsusiyyətlər: ${parsed.propertyPreferences.mustHaves.join(", ")}`,
    );
  if (calendarEventId)
    lines.push(`Google Calendar tədbiri yaradıldı (ID: ${calendarEventId}).`);

  if (!env.googleSheetsId) {
    lines.push(
      "Qeyd: GOOGLE_SHEETS_ID təyin edilməyib, CRM yazılışı imitasiya olundu.",
    );
  }

  return lines.join("\n");
}


