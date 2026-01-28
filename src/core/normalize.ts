export interface NormalizedMessage {
  text: string;
  telegramUserId: string;
  chatId: string;
  isVoice: boolean;
  voiceLanguage?: "az" | "en" | "unknown";
}

export function normalizeText(text: string): string {
  return text.trim();
}


