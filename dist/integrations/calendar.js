"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCalendarEvent = createCalendarEvent;
const googleapis_1 = require("googleapis");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const googleAuth_1 = require("./googleAuth");
async function getCalendarClient() {
    const oAuth2Client = (0, googleAuth_1.createOAuth2Client)();
    const saved = await (0, googleAuth_1.loadSavedTokens)();
    if (saved) {
        oAuth2Client.setCredentials(saved);
    }
    return googleapis_1.google.calendar({ version: "v3", auth: oAuth2Client });
}
async function createCalendarEvent(input) {
    if (!env_1.env.googleCalendarId) {
        logger_1.logger.warn("GOOGLE_CALENDAR_ID not set, skipping calendar event");
        return null;
    }
    const calendar = await getCalendarClient();
    const event = {
        summary: input.summary,
        description: input.description ?? "",
        start: {
            dateTime: input.startDateTime,
            timeZone: "Asia/Baku",
        },
        end: {
            dateTime: input.endDateTime,
            timeZone: "Asia/Baku",
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: "email", minutes: 24 * 60 }, // 1 day
                { method: "email", minutes: 60 }, // 1 hour
            ],
        },
    };
    if (input.attendeeEmail) {
        event.attendees = [{ email: input.attendeeEmail }];
    }
    const res = await calendar.events.insert({
        calendarId: env_1.env.googleCalendarId,
        requestBody: event,
    });
    const eventId = res.data.id ?? null;
    logger_1.logger.info("Created Google Calendar event", { eventId });
    return eventId;
}
//# sourceMappingURL=calendar.js.map