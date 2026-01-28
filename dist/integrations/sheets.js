"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendCrmRow = appendCrmRow;
exports.upsertBuyerRequirements = upsertBuyerRequirements;
const googleapis_1 = require("googleapis");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const googleAuth_1 = require("./googleAuth");
async function getSheetsClient() {
    const oAuth2Client = (0, googleAuth_1.createOAuth2Client)();
    const saved = await (0, googleAuth_1.loadSavedTokens)();
    if (saved) {
        oAuth2Client.setCredentials(saved);
    }
    return googleapis_1.google.sheets({ version: "v4", auth: oAuth2Client });
}
async function appendCrmRow(input) {
    if (!env_1.env.googleSheetsId) {
        logger_1.logger.warn("GOOGLE_SHEETS_ID not set, skipping CRM write");
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
        spreadsheetId: env_1.env.googleSheetsId,
        range: `${env_1.env.googleSheetsCrmTab}!A:Z`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
    });
}
async function upsertBuyerRequirements(input) {
    if (!env_1.env.googleSheetsId) {
        logger_1.logger.warn("GOOGLE_SHEETS_ID not set, skipping buyer requirements write");
        return;
    }
    const sheets = await getSheetsClient();
    const sheetName = env_1.env.googleSheetsBuyersTab;
    const range = `${sheetName}!A:Z`;
    const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: env_1.env.googleSheetsId,
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
    let targetRowIndex = null;
    if (nameIdx >= 0 && input.clientName) {
        for (let i = 1; i < values.length; i++) {
            if ((values[i][nameIdx] || "").toString().trim() === input.clientName) {
                targetRowIndex = i;
                break;
            }
        }
    }
    const row = new Array(header.length).fill("");
    if (nameIdx >= 0)
        row[nameIdx] = input.clientName ?? "";
    if (contactIdx >= 0)
        row[contactIdx] = input.contact ?? "";
    if (rentOrBuyIdx >= 0)
        row[rentOrBuyIdx] = input.rentOrBuy ?? "";
    if (budgetIdx >= 0)
        row[budgetIdx] = input.budget ?? "";
    if (bedroomsIdx >= 0)
        row[bedroomsIdx] = input.bedrooms ?? "";
    if (locationsIdx >= 0)
        row[locationsIdx] = input.locations ?? "";
    if (propertyTypeIdx >= 0)
        row[propertyTypeIdx] = input.propertyType ?? "";
    if (mustHavesIdx >= 0)
        row[mustHavesIdx] = input.mustHaves ?? "";
    if (notesIdx >= 0)
        row[notesIdx] = input.notes ?? "";
    if (updatedAtIdx >= 0)
        row[updatedAtIdx] = new Date().toISOString();
    if (targetRowIndex === null) {
        // append new
        await sheets.spreadsheets.values.append({
            spreadsheetId: env_1.env.googleSheetsId,
            range,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [row],
            },
        });
    }
    else {
        const rowNumber = targetRowIndex + 1; // 1-based
        const updateRange = `${sheetName}!A${rowNumber}:Z${rowNumber}`;
        await sheets.spreadsheets.values.update({
            spreadsheetId: env_1.env.googleSheetsId,
            range: updateRange,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [row],
            },
        });
    }
}
//# sourceMappingURL=sheets.js.map