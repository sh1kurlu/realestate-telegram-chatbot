import { Intent } from "../ai/schemas";

export function isMeetingIntent(intent: Intent): boolean {
  return intent === "schedule_meeting" || intent === "add_client";
}

export function requiresBuyerRequirements(intent: Intent): boolean {
  return intent === "save_buyer_requirements";
}


