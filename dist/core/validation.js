"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParsedInfo = validateParsedInfo;
function validateParsedInfo(parsed) {
    const missingFields = [];
    if (!parsed.clientName) {
        missingFields.push("clientName");
    }
    if (parsed.intent === "schedule_meeting" ||
        parsed.intent === "add_client") {
        if (!parsed.meetingDateTime)
            missingFields.push("meetingDateTime");
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
//# sourceMappingURL=validation.js.map