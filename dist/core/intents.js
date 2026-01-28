"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMeetingIntent = isMeetingIntent;
exports.requiresBuyerRequirements = requiresBuyerRequirements;
function isMeetingIntent(intent) {
    return intent === "schedule_meeting" || intent === "add_client";
}
function requiresBuyerRequirements(intent) {
    return intent === "save_buyer_requirements";
}
//# sourceMappingURL=intents.js.map