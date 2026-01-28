## Real Estate Assistant (Telegram + Voice + CRM + Calendar + Vector Memory)

AI-powered real estate assistant for agents, operated entirely via Telegram (text + voice).

The assistant:

- **Understands text and Azerbaijani voice notes**
- **Extracts structured information (intent + client / meeting / property details)**
- **Stores data into a Google Sheets CRM**
- **Creates Google Calendar meetings**
- **Sends email reminders**
- **Maintains buyer requirements in a separate tab**
- **Uses a vector database to remember and reason over past voice interactions**

---

## Features Overview

- **Telegram Bot (grammY)**
  - Text messages and voice notes
  - Voice download from Telegram
  - Audio conversion to WAV using `ffmpeg`
  - Transcription via OpenAI Whisper
  - Azerbaijani language detection (ə, ğ, ş, ı, ö, ü, ç)

- **AI Layer (OpenAI)**
  - Intent detection:
    - `schedule_meeting`
    - `add_client`
    - `send_reminder`
    - `save_buyer_requirements`
    - `unknown`
  - Structured JSON parsing for:
    - Client info
    - Meeting info
    - Property preferences
  - Relative time resolution in timezone **Asia/Baku**

- **Vector Memory (Voice Only)**
  - Embeds only **voice-derived** text using `text-embedding-3-large`
  - Stores vectors locally (Chroma-style, file-based under `data/chroma/`)
  - Optional Pinecone fallback if configured
  - Used to resolve vague follow-ups:
    - “Same client”
    - “Yes, that one”
    - “Same budget as before”
  - Similarity ≥ 0.85 → auto-fill missing fields, else ask for clarification

- **Google Sheets CRM**
  - **CRM tab** (e.g. `CRM`):
    - Client Name, Email, Phone
    - Meeting DateTime
    - Purpose, Location
    - Budget, Rent/Buy, Bedrooms
    - Property Type, Preferred Locations, Must-haves
    - Notes, Raw Message, Created At
  - **ActiveBuyers tab** (e.g. `ActiveBuyers`):
    - Client Name, Contact
    - Rent/Buy, Budget, Bedrooms
    - Locations, Property Type, Must-haves
    - Notes, Updated At
  - Upsert behavior for buyer requirements

- **Google Calendar**
  - Creates events when `meetingDateTime` is present
  - Adds description + notes
  - Adds reminders:
    - 1 day before
    - 1 hour before
  - Adds client email as attendee when available

- **Notifications**
  - Email to client via **Nodemailer**:
    - “Reminder: Meeting scheduled on {date/time} with {AGENT_NAME}”
  - Telegram notification back to the agent summarizing:
    - Detected intent
    - Parsed data
    - CRM / Calendar / Email status

- **Backup Reminders**
  - `data/reminders.json` stores scheduled reminders
  - `node-cron` job checks every minute
  - Sends Telegram reminder when due

---

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript
- **Frameworks**: Express, grammY (Telegram Bot API)
- **AI**: OpenAI (Whisper, Chat Completions, Embeddings)
- **Storage**:
  - Google Sheets (CRM + ActiveBuyers)
  - Local file-based Chroma-style vector store (under `data/chroma/`)
  - Optional Pinecone vector DB fallback
- **Scheduling**: `node-cron`
- **Email**: Nodemailer (SMTP)
- **Calendar**: Google Calendar API

---

## Repository Structure

```text
real-estate-assistant/
  README.md
  package.json
  tsconfig.json
  .env           # you create this, based on variables below
  src/
    index.ts
    config/
      env.ts
      logger.ts
    telegram/
      bot.ts
      handlers.ts
      voice.ts
    ai/
      llm.ts
      parser.ts
      schemas.ts
    vector/
      index.ts
      embeddings.ts
      chroma.ts
      pinecone.ts
    integrations/
      googleAuth.ts
      sheets.ts
      calendar.ts
      email.ts
    core/
      intents.ts
      normalize.ts
      time.ts
      validation.ts
      workflow.ts
      state.ts
    jobs/
      scheduler.ts
      reminderStore.ts
  data/
    reminders.json
    chroma/
      store.json
```

> Note: `.env.example` cannot be committed by this agent in this environment. Use the **Environment Variables** section below to create your own `.env` file.

---

## Environment Variables

Create a `.env` file in the project root with:

```bash
TELEGRAM_BOT_TOKEN=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary

GOOGLE_SHEETS_ID=
GOOGLE_SHEETS_CRM_TAB=CRM
GOOGLE_SHEETS_BUYERS_TAB=ActiveBuyers

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

AGENT_NAME=

PINECONE_API_KEY=
PINECONE_INDEX=
```

---

## Installation & Setup

### 1. Install Dependencies

From the `real-estate-assistant` directory:

```bash
npm install
```

Ensure you have **Node.js 20+** installed.

### 2. System Requirements

- `ffmpeg` must be installed and available on your `PATH`.

On macOS (Homebrew):

```bash
brew install ffmpeg
```

### 3. Create Google Cloud OAuth Credentials

1. Go to Google Cloud Console.
2. Create a new project (or use an existing one).
3. Enable APIs:
   - Google Sheets API
   - Google Calendar API
4. Create **OAuth 2.0 Client ID** (type: Web application).
5. Set Authorized redirect URI to:
   - `http://localhost:3000/auth/google/callback`
6. Copy:
   - Client ID → `GOOGLE_CLIENT_ID`
   - Client Secret → `GOOGLE_CLIENT_SECRET`

### 4. Configure Google Sheets

Create a Google Sheet with at least two tabs:

- **CRM** (or name in `GOOGLE_SHEETS_CRM_TAB`)
- **ActiveBuyers** (or name in `GOOGLE_SHEETS_BUYERS_TAB`)

Recommended headers:

- **CRM tab**
  - `Client Name`
  - `Email`
  - `Phone`
  - `Meeting DateTime`
  - `Purpose`
  - `Location`
  - `Budget`
  - `Rent/Buy`
  - `Bedrooms`
  - `Property Type`
  - `Preferred Locations`
  - `Must-haves`
  - `Notes`
  - `Raw Message`
  - `Created At`

- **ActiveBuyers tab**
  - `Client Name`
  - `Contact`
  - `Rent/Buy`
  - `Budget`
  - `Bedrooms`
  - `Locations`
  - `Property Type`
  - `Must-haves`
  - `Notes`
  - `Updated At`

Put the Google Sheet ID (from its URL) into `GOOGLE_SHEETS_ID`.

### 5. Configure SMTP (Nodemailer)

Provide:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

These are used to send meeting reminder emails to clients.

### 6. OpenAI API

Set:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default `gpt-4o-mini` is recommended)

This is used for:

- Whisper transcription (`whisper-1`)
- Chat completions for intent + JSON parsing
- Embeddings (`text-embedding-3-large`)

### 7. Telegram Bot Token

1. Talk to `@BotFather` in Telegram.
2. Create a bot, and copy the token.
3. Put it into `TELEGRAM_BOT_TOKEN`.

This bot uses long polling via grammY by default (no webhook setup required).

### 8. Optional: Pinecone Vector DB

If you want Pinecone as a fallback for vector memory:

- `PINECONE_API_KEY`
- `PINECONE_INDEX`

If not set, the assistant will use only the local file-based vector store.

---

## Running the App

### Development

```bash
npm run dev
```

This runs `src/index.ts` with `ts-node-dev` (auto-restart on changes).

### Production Build

```bash
npm run build
npm start
```

The Express server listens on port **3000** by default (configurable in `env.ts`).

---

## Telegram Interaction Flow

1. **User sends text or voice message** to the Telegram bot.
2. **Voice messages**:
   - Bot downloads the file from Telegram.
   - Converts to WAV with `ffmpeg`.
   - Sends to OpenAI Whisper for transcription (`whisper-1`).
   - Detects Azerbaijani characters (ə, ğ, ş, ı, ö, ü, ç) → sets `language="az"`, otherwise auto-detect.
3. The resulting text (from text or voice) is processed identically:
   - Intent detection (`schedule_meeting`, `add_client`, `send_reminder`, `save_buyer_requirements`, `unknown`).
   - Vector memory lookup (for **voice-based** messages only).
   - JSON parsing of client / meeting / property details.
   - Resolution of relative times in timezone **Asia/Baku**.
4. If required fields are missing:
   - The bot asks follow-up questions and keeps temporary conversation state.
5. On completion:
   - Data is written to Google Sheets CRM and/or ActiveBuyers.
   - Google Calendar event is created if `meetingDateTime` is present.
   - Email reminder is sent to the client.
   - Telegram confirmation is sent back to the agent.

---

## Vector Memory Details

- **What is stored**:

```ts
{
  id: string;
  embedding: number[];
  metadata: {
    source: "voice";
    telegramUserId: string;
    chatId: string;
    timestamp: string; // ISO
    rawText: string;
    detectedLanguage: "az" | "en" | "unknown";
    detectedIntent?: string;
    clientName?: string;
    meetingDateTime?: string; // ISO
  };
}
```

- Only **voice-derived** text is embedded.
- Stored locally under `data/chroma/store.json`.
- For queries, we:
  - Filter by `telegramUserId`.
  - Compute cosine similarity.
  - Take the top 3–5 matches.
  - If similarity ≥ 0.85, we use them to auto-fill missing fields (e.g. same client, same budget).
  - Otherwise, the assistant explicitly asks for clarification.

### Resetting Vector Memory

- To reset local vector memory:
  - Stop the app.
  - Delete `data/chroma/store.json`.
  - Restart the app (it will recreate the file).

If Pinecone is enabled, refer to your Pinecone dashboard to clear the index.

---

## Reminder Scheduler

- `data/reminders.json` holds backup reminders in this shape:

```ts
{
  id: string;
  chatId: string;
  message: string;
  dueAt: string;   // ISO string
  sent: boolean;
}
```

- A cron job (every minute) checks for due reminders and sends Telegram messages.
- This is a backup in addition to Google Calendar reminders.

---

## Example Telegram Messages

### English Text

- **Schedule meeting**
  - “Please schedule a meeting with John Doe tomorrow at 3pm at our office to discuss renting a 2-bedroom apartment in Baku, budget up to 800 AZN. His email is john@example.com and phone is +994501234567.”

- **Save buyer requirements**
  - “Add a new buyer: Ali, looking to buy a 3-bedroom apartment in Nizami or Yasamal, budget up to 250,000 AZN, must have underground parking.”

### Azerbaijani Voice (approximate examples)

- “Sabah saat 11-də Nigar xanımla görüş təyin et, 2 otaqlı kirayə ev axtarır, büdcə 700 manat, şəhər mərkəzi olsun.”
- “Eyni müştəri üçün eyni büdcə qalsın, sadəcə 3 otaqlı evlərə də baxaq.”

The assistant will:

- Transcribe with Whisper (language `az`).
- Use vector memory to understand references like “eyni müştəri”, “eyni büdcə”.

---

## Common Errors & Troubleshooting

- **Bot does not respond**
  - Check `TELEGRAM_BOT_TOKEN` is correct.
  - Ensure `npm run dev` or `npm start` is running.
  - Check logs in the console for errors.

- **Google Sheets permission / 403**
  - Make sure:
    - Google OAuth has Sheets + Calendar scopes.
    - The service/account has access to the Sheet (`GOOGLE_SHEETS_ID`).

- **Calendar event not created**
  - Confirm `GOOGLE_CALENDAR_ID` is valid (often `primary`).
  - Check that `meetingDateTime` was parsed and present in logs.

- **Email not sent**
  - Verify SMTP credentials and host/port.
  - Some providers require “less secure app” or app passwords.

- **Whisper / OpenAI errors**
  - Check `OPENAI_API_KEY`.
  - Ensure audio is correctly converted to WAV (`ffmpeg` installed).

- **Vector memory not behaving**
  - Check `data/chroma/store.json` exists and is writable.
  - For Pinecone, confirm index name and region in Pinecone dashboard.

---

## Development Notes

- Logging is implemented via a Winston-based logger (`config/logger.ts`).
- All external integrations are wrapped with graceful error handling.
- The main orchestrator is `core/workflow.ts`, which:
  - Receives normalized message input.
  - Detects intent.
  - Retrieves vector context for voice.
  - Parses structured data (JSON).
  - Requests follow-ups if needed (conversation state).
  - Writes to Sheets.
  - Creates Calendar events.
  - Sends email + Telegram notifications.

---

## Human-Only Checklist (FINAL)

Before using this assistant in real life, you must:

1. **Create Telegram bot token** (via `@BotFather`) and put it into `TELEGRAM_BOT_TOKEN`.
2. **Create Google Cloud OAuth credentials** with Sheets + Calendar scopes and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and fetch `GOOGLE_REFRESH_TOKEN` via the `/auth/google` flow.
3. **Create Google Sheet with tabs + headers** (`CRM` and `ActiveBuyers`) and set `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_CRM_TAB`, `GOOGLE_SHEETS_BUYERS_TAB`.
4. **Provide SMTP credentials** (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) for Nodemailer.
5. **Add OpenAI API key** (`OPENAI_API_KEY`) and confirm `OPENAI_MODEL`.
6. **(Optional) Pinecone API key** and index name (`PINECONE_API_KEY`, `PINECONE_INDEX`) if you want cloud vector memory.
7. **Run app and test**:
   - `npm run dev`
   - Send text and Azerbaijani voice messages.
   - Verify CRM, Calendar, emails, and reminders.


