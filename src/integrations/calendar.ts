import { google } from "googleapis";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { createOAuth2Client, loadSavedTokens } from "./googleAuth";

async function getCalendarClient() {
  const oAuth2Client = createOAuth2Client();
  const saved = await loadSavedTokens();
  if (saved) {
    oAuth2Client.setCredentials(saved);
  }
  return google.calendar({ version: "v3", auth: oAuth2Client });
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startDateTime: string; // ISO
  endDateTime: string; // ISO
  attendeeEmail?: string | null;
}

export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<string | null> {
  if (!env.googleCalendarId) {
    logger.warn("GOOGLE_CALENDAR_ID not set, skipping calendar event");
    return null;
  }

  const calendar = await getCalendarClient();

  const event: any = {
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
    calendarId: env.googleCalendarId,
    requestBody: event,
  });

  const eventId = res.data.id ?? null;
  logger.info("Created Google Calendar event", { eventId });
  return eventId;
}


