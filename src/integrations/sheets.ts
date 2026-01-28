import { google } from "googleapis";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { createOAuth2Client, loadSavedTokens } from "./googleAuth";

async function getSheetsClient() {
  const oAuth2Client = createOAuth2Client();
  const saved = await loadSavedTokens();
  if (saved) {
    oAuth2Client.setCredentials(saved);
  }
  return google.sheets({ version: "v4", auth: oAuth2Client });
}

export interface CrmRowInput {
  clientName?: string | null;
  email?: string | null;
  phone?: string | null;
  meetingDateTime?: string | null;
  meetingPurpose?: string | null;
  location?: string | null;
  budget?: string | null;
  rentOrBuy?: string | null;
  bedrooms?: string | null;
  propertyType?: string | null;
  preferredLocations?: string | null;
  mustHaves?: string | null;
  notes?: string | null;
  rawMessage?: string | null;
}

export async function appendCrmRow(input: CrmRowInput): Promise<void> {
  if (!env.googleSheetsId) {
    logger.warn("GOOGLE_SHEETS_ID not set, skipping CRM write");
    return;
  }

  const sheets = await getSheetsClient();
  const values = [
    [
      input.clientName ?? "",
      input.email ?? "",
      input.phone ?? "",
      input.meetingDateTime ?? "",
      input.meetingPurpose ?? "",
      input.location ?? "",
      input.budget ?? "",
      input.rentOrBuy ?? "",
      input.bedrooms ?? "",
      input.propertyType ?? "",
      input.preferredLocations ?? "",
      input.mustHaves ?? "",
      input.notes ?? "",
      input.rawMessage ?? "",
      new Date().toISOString(),
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.googleSheetsId,
    range: `${env.googleSheetsCrmTab}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

export interface BuyerRequirementsInput {
  clientName?: string | null;
  contact?: string | null;
  rentOrBuy?: string | null;
  budget?: string | null;
  bedrooms?: string | null;
  locations?: string | null;
  propertyType?: string | null;
  mustHaves?: string | null;
  notes?: string | null;
}

export async function upsertBuyerRequirements(
  input: BuyerRequirementsInput,
): Promise<void> {
  if (!env.googleSheetsId) {
    logger.warn("GOOGLE_SHEETS_ID not set, skipping buyer requirements write");
    return;
  }

  const sheets = await getSheetsClient();
  const sheetName = env.googleSheetsBuyersTab;
  const range = `${sheetName}!A:Z`;

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: env.googleSheetsId,
    range,
  });

  const values = existing.data.values || [];
  const header = values[0] || [];

  const nameIdx = header.indexOf("Client Name");
  const contactIdx = header.indexOf("Contact");
  const rentOrBuyIdx = header.indexOf("Rent/Buy");
  const budgetIdx = header.indexOf("Budget");
  const bedroomsIdx = header.indexOf("Bedrooms");
  const locationsIdx = header.indexOf("Locations");
  const propertyTypeIdx = header.indexOf("Property Type");
  const mustHavesIdx = header.indexOf("Must-haves");
  const notesIdx = header.indexOf("Notes");
  const updatedAtIdx = header.indexOf("Updated At");

  let targetRowIndex: number | null = null;
  if (nameIdx >= 0 && input.clientName) {
    for (let i = 1; i < values.length; i++) {
      if ((values[i][nameIdx] || "").toString().trim() === input.clientName) {
        targetRowIndex = i;
        break;
      }
    }
  }

  const row: string[] = new Array(header.length).fill("");
  if (nameIdx >= 0) row[nameIdx] = input.clientName ?? "";
  if (contactIdx >= 0) row[contactIdx] = input.contact ?? "";
  if (rentOrBuyIdx >= 0) row[rentOrBuyIdx] = input.rentOrBuy ?? "";
  if (budgetIdx >= 0) row[budgetIdx] = input.budget ?? "";
  if (bedroomsIdx >= 0) row[bedroomsIdx] = input.bedrooms ?? "";
  if (locationsIdx >= 0) row[locationsIdx] = input.locations ?? "";
  if (propertyTypeIdx >= 0) row[propertyTypeIdx] = input.propertyType ?? "";
  if (mustHavesIdx >= 0) row[mustHavesIdx] = input.mustHaves ?? "";
  if (notesIdx >= 0) row[notesIdx] = input.notes ?? "";
  if (updatedAtIdx >= 0) row[updatedAtIdx] = new Date().toISOString();

  if (targetRowIndex === null) {
    // append new
    await sheets.spreadsheets.values.append({
      spreadsheetId: env.googleSheetsId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  } else {
    const rowNumber = targetRowIndex + 1; // 1-based
    const updateRange = `${sheetName}!A${rowNumber}:Z${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: env.googleSheetsId,
      range: updateRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  }
}


