import { Application, Request, Response } from "express";
import { google } from "googleapis";
import fs from "fs-extra";
import path from "path";
import { env } from "../config/env";
import { logger } from "../config/logger";

const TOKEN_PATH = path.join(process.cwd(), "data", "google-tokens.json");

export function createOAuth2Client() {
  const oAuth2Client = new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    env.googleRedirectUri,
  );

  if (env.googleRefreshToken) {
    oAuth2Client.setCredentials({
      refresh_token: env.googleRefreshToken,
    });
  }

  return oAuth2Client;
}

export async function loadSavedTokens() {
  try {
    if (await fs.pathExists(TOKEN_PATH)) {
      const data = await fs.readJSON(TOKEN_PATH);
      return data;
    }
  } catch (err) {
    logger.error("Failed to load saved Google tokens", { err });
  }
  return null;
}

export async function saveTokens(tokens: any) {
  try {
    await fs.ensureDir(path.dirname(TOKEN_PATH));
    await fs.writeJSON(TOKEN_PATH, tokens, { spaces: 2 });
  } catch (err) {
    logger.error("Failed to save Google tokens", { err });
  }
}

export function registerGoogleAuthRoutes(app: Application) {
  app.get("/auth/google", async (_req: Request, res: Response) => {
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

  app.get("/auth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    if (!code) {
      res.status(400).send("Missing code parameter");
      return;
    }

    try {
      const oAuth2Client = createOAuth2Client();
      const { tokens } = await oAuth2Client.getToken(code);
      await saveTokens(tokens);
      res.send(
        "Google authorization successful. Tokens saved. You can now close this window.",
      );
    } catch (err) {
      logger.error("Error handling Google OAuth callback", { err });
      res.status(500).send("Failed to complete Google OAuth flow.");
    }
  });
}


