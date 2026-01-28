import { ParsedInfo } from "../ai/schemas";

export interface ValidationResult {
  missingFields: string[];
}

export function validateParsedInfo(parsed: ParsedInfo): ValidationResult {
  const missingFields: string[] = [];

  if (!parsed.clientName) {
    missingFields.push("clientName");
  }

  if (
    parsed.intent === "schedule_meeting" ||
    parsed.intent === "add_client"
  ) {
    if (!parsed.meetingDateTime) missingFields.push("meetingDateTime");
  }

  if (parsed.intent === "save_buyer_requirements") {
    if (!parsed.propertyPreferences?.rentOrBuy) {
      missingFields.push("propertyPreferences.rentOrBuy");
    }
    if (!parsed.propertyPreferences?.budget) {
      missingFields.push("propertyPreferences.budget");
    }
  }

  return { missingFields };
}


