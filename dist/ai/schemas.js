"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsedInfoSchema = exports.IntentSchema = void 0;
const zod_1 = require("zod");
exports.IntentSchema = zod_1.z.enum([
    "schedule_meeting",
    "add_client",
    "send_reminder",
    "save_buyer_requirements",
    "unknown",
]);
exports.ParsedInfoSchema = zod_1.z.object({
    intent: exports.IntentSchema,
    clientName: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().optional().nullable(),
    phone: zod_1.z.string().optional().nullable(),
    meetingDateTime: zod_1.z.string().optional().nullable(), // ISO
    meetingPurpose: zod_1.z.string().optional().nullable(),
    location: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    propertyPreferences: zod_1.z
        .object({
        rentOrBuy: zod_1.z.string().optional().nullable(),
        budget: zod_1.z.string().optional().nullable(),
        bedrooms: zod_1.z.string().optional().nullable(),
        cityOrNeighborhood: zod_1.z.string().optional().nullable(),
        propertyType: zod_1.z.string().optional().nullable(),
        mustHaves: zod_1.z.array(zod_1.z.string()).optional().nullable(),
    })
        .optional()
        .nullable(),
});
//# sourceMappingURL=schemas.js.map