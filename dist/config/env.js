"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 3000),
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ||
        "http://localhost:3000/auth/google/callback",
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
    googleCalendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    googleSheetsId: process.env.GOOGLE_SHEETS_ID || "",
    googleSheetsCrmTab: process.env.GOOGLE_SHEETS_CRM_TAB || "CRM",
    googleSheetsBuyersTab: process.env.GOOGLE_SHEETS_BUYERS_TAB || "ActiveBuyers",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    agentName: process.env.AGENT_NAME || "Your Agent",
    pineconeApiKey: process.env.PINECONE_API_KEY || "",
    pineconeIndex: process.env.PINECONE_INDEX || "",
};
//# sourceMappingURL=env.js.map