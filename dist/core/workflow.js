"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWorkflow = runWorkflow;
const normalize_1 = require("./normalize");
const llm_1 = require("../ai/llm");
const vector_1 = require("../vector");
const validation_1 = require("./validation");
const state_1 = require("./state");
const sheets_1 = require("../integrations/sheets");
const calendar_1 = require("../integrations/calendar");
const email_1 = require("../integrations/email");
const env_1 = require("../config/env");
const time_1 = require("./time");
const intents_1 = require("./intents");
const logger_1 = require("../config/logger");
async function runWorkflow(input) {
    const normalized = {
        text: (0, normalize_1.normalizeText)(input.text),
        telegramUserId: input.telegramUserId,
        chatId: input.chatId,
        isVoice: input.isVoice,
        voiceLanguage: input.voiceMetadata?.detectedLanguage,
    };
    const keyState = (0, state_1.getConversationState)(normalized.telegramUserId, normalized.chatId);
    if (keyState && keyState.awaitingFields && keyState.awaitingFields.length) {
        // Simple follow-up: treat this message as providing missing info.
        // For MVP, we re-run parsing but keep previous data as fallback.
        logger_1.logger.info("Handling follow-up message for missing fields");
    }
    let vectorContext = null;
    if (normalized.isVoice) {
        try {
            vectorContext = await (0, vector_1.queryVoiceContext)({
                text: normalized.text,
                telegramUserId: normalized.telegramUserId,
            });
        }
        catch (err) {
            logger_1.logger.error("Failed to query voice vector context", { err });
        }
    }
    const parsed = await (0, llm_1.detectIntentAndParse)({
        text: normalized.text,
        vectorContext,
    });
    const validation = (0, validation_1.validateParsedInfo)(parsed);
    // If missing required fields, ask a clarifying question and store state.
    if (validation.missingFields.length > 0) {
        (0, state_1.setConversationState)(normalized.telegramUserId, normalized.chatId, {
            lastParsedInfo: parsed,
            awaitingFields: validation.missingFields,
        });
        const missingList = validation.missingFields
            .map((f) => `- ${f}`)
            .join("\n");
        return `Daha dəqiq davam etmək üçün aşağıdakı məlumatlar çatışmır:\n${missingList}\n\nZəhmət olmasa bu məlumatları göndərin.`;
    }
    // No missing fields: clear state
    (0, state_1.clearConversationState)(normalized.telegramUserId, normalized.chatId);
    // Voice vectors: store for future context
    if (normalized.isVoice) {
        try {
            await (0, vector_1.storeVoiceVector)({
                text: normalized.text,
                telegramUserId: normalized.telegramUserId,
                chatId: normalized.chatId,
                detectedLanguage: normalized.voiceLanguage ?? "unknown",
                detectedIntent: parsed.intent,
                clientName: parsed.clientName ?? undefined,
                meetingDateTime: parsed.meetingDateTime ?? undefined,
            });
        }
        catch (err) {
            logger_1.logger.error("Failed to store voice vector", { err });
        }
    }
    // Write to Google Sheets CRM
    await (0, sheets_1.appendCrmRow)({
        clientName: parsed.clientName,
        email: parsed.email,
        phone: parsed.phone,
        meetingDateTime: parsed.meetingDateTime
            ? (0, time_1.ensureBakuIso)(parsed.meetingDateTime)
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
    if ((0, intents_1.requiresBuyerRequirements)(parsed.intent)) {
        await (0, sheets_1.upsertBuyerRequirements)({
            clientName: parsed.clientName,
            contact: parsed.email ||
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
    let calendarEventId = null;
    if ((0, intents_1.isMeetingIntent)(parsed.intent) && parsed.meetingDateTime) {
        const startIso = (0, time_1.ensureBakuIso)(parsed.meetingDateTime);
        // For MVP, set end time +1 hour
        const endIso = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();
        const summary = `Meeting with ${parsed.clientName ?? "client"}`;
        const description = `Purpose: ${parsed.meetingPurpose ?? ""}\nLocation: ${parsed.location ?? ""}\nNotes: ${parsed.notes ?? ""}\nOriginal message:\n${normalized.text}`;
        calendarEventId = await (0, calendar_1.createCalendarEvent)({
            summary,
            description,
            startDateTime: startIso,
            endDateTime: endIso,
            attendeeEmail: parsed.email ?? null,
        });
        if (parsed.email) {
            await (0, email_1.sendMeetingReminderEmail)({
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
    const lines = [];
    lines.push(`**${intentLabel}**`);
    if (parsed.clientName)
        lines.push(`Müştəri: ${parsed.clientName}`);
    if (parsed.phone)
        lines.push(`Telefon: ${parsed.phone}`);
    if (parsed.email)
        lines.push(`Email: ${parsed.email}`);
    if (parsed.meetingDateTime)
        lines.push(`Görüş vaxtı: ${(0, time_1.ensureBakuIso)(parsed.meetingDateTime)}`);
    if (parsed.location)
        lines.push(`Məkan: ${parsed.location}`);
    if (parsed.propertyPreferences?.rentOrBuy)
        lines.push(`Tip: ${parsed.propertyPreferences.rentOrBuy}`);
    if (parsed.propertyPreferences?.budget)
        lines.push(`Büdcə: ${parsed.propertyPreferences.budget}`);
    if (parsed.propertyPreferences?.bedrooms)
        lines.push(`Otaq sayı: ${parsed.propertyPreferences.bedrooms}`);
    if (parsed.propertyPreferences?.cityOrNeighborhood)
        lines.push(`Rayon/Şəhər: ${parsed.propertyPreferences.cityOrNeighborhood}`);
    if (parsed.propertyPreferences?.propertyType)
        lines.push(`Əmlak növü: ${parsed.propertyPreferences.propertyType}`);
    if (parsed.propertyPreferences?.mustHaves?.length)
        lines.push(`Vacib xüsusiyyətlər: ${parsed.propertyPreferences.mustHaves.join(", ")}`);
    if (calendarEventId)
        lines.push(`Google Calendar tədbiri yaradıldı (ID: ${calendarEventId}).`);
    if (!env_1.env.googleSheetsId) {
        lines.push("Qeyd: GOOGLE_SHEETS_ID təyin edilməyib, CRM yazılışı imitasiya olundu.");
    }
    return lines.join("\n");
}
//# sourceMappingURL=workflow.js.map