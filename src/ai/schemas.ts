import { z } from "zod";

export const IntentSchema = z.enum([
  "schedule_meeting",
  "add_client",
  "send_reminder",
  "save_buyer_requirements",
  "unknown",
]);

export type Intent = z.infer<typeof IntentSchema>;

export const ParsedInfoSchema = z.object({
  intent: IntentSchema,
  clientName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  meetingDateTime: z.string().optional().nullable(), // ISO
  meetingPurpose: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  propertyPreferences: z
    .object({
      rentOrBuy: z.string().optional().nullable(),
      budget: z.string().optional().nullable(),
      bedrooms: z.string().optional().nullable(),
      cityOrNeighborhood: z.string().optional().nullable(),
      propertyType: z.string().optional().nullable(),
      mustHaves: z.array(z.string()).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type ParsedInfo = z.infer<typeof ParsedInfoSchema>;


