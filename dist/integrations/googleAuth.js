"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOAuth2Client = createOAuth2Client;
exports.loadSavedTokens = loadSavedTokens;
exports.saveTokens = saveTokens;
exports.registerGoogleAuthRoutes = registerGoogleAuthRoutes;
const googleapis_1 = require("googleapis");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const TOKEN_PATH = path_1.default.join(process.cwd(), "data", "google-tokens.json");
function createOAuth2Client() {
    const oAuth2Client = new googleapis_1.google.auth.OAuth2(env_1.env.googleClientId, env_1.env.googleClientSecret, env_1.env.googleRedirectUri);
    if (env_1.env.googleRefreshToken) {
        oAuth2Client.setCredentials({
            refresh_token: env_1.env.googleRefreshToken,
        });
    }
    return oAuth2Client;
}
async function loadSavedTokens() {
    try {
        if (await fs_extra_1.default.pathExists(TOKEN_PATH)) {
            const data = await fs_extra_1.default.readJSON(TOKEN_PATH);
            return data;
        }
    }
    catch (err) {
        logger_1.logger.error("Failed to load saved Google tokens", { err });
    }
    return null;
}
async function saveTokens(tokens) {
    try {
        await fs_extra_1.default.ensureDir(path_1.default.dirname(TOKEN_PATH));
        await fs_extra_1.default.writeJSON(TOKEN_PATH, tokens, { spaces: 2 });
    }
    catch (err) {
        logger_1.logger.error("Failed to save Google tokens", { err });
    }
}
function registerGoogleAuthRoutes(app) {
    app.get("/auth/google", async (_req, res) => {
        const oAuth2Client = createOAuth2Client();
        const scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/calendar",
        ];
        const url = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: scopes,
            prompt: "consent",
        });
        res.redirect(url);
    });
    app.get("/auth/google/callback", async (req, res) => {
        const code = req.query.code;
        if (!code) {
            res.status(400).send("Missing code parameter");
            return;
        }
        try {
            const oAuth2Client = createOAuth2Client();
            const { tokens } = await oAuth2Client.getToken(code);
            await saveTokens(tokens);
            res.send("Google authorization successful. Tokens saved. You can now close this window.");
        }
        catch (err) {
            logger_1.logger.error("Error handling Google OAuth callback", { err });
            res.status(500).send("Failed to complete Google OAuth flow.");
        }
    });
}
//# sourceMappingURL=googleAuth.js.map