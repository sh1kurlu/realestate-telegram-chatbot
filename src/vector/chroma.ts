import fs from "fs-extra";
import path from "path";
import { cosineSimilarity } from "./embeddings";
import { logger } from "../config/logger";

export interface VoiceVectorMetadata {
  source: "voice";
  telegramUserId: string;
  chatId: string;
  timestamp: string;
  rawText: string;
  detectedLanguage: "az" | "en" | "unknown";
  detectedIntent?: string;
  clientName?: string;
  meetingDateTime?: string;
}

export interface VoiceVectorRecord {
  id: string;
  embedding: number[];
  metadata: VoiceVectorMetadata;
}

const DATA_DIR = path.join(process.cwd(), "data", "chroma");
const STORE_PATH = path.join(DATA_DIR, "store.json");

async function ensureStore(): Promise<VoiceVectorRecord[]> {
  await fs.ensureDir(DATA_DIR);
  if (!(await fs.pathExists(STORE_PATH))) {
    await fs.writeJSON(STORE_PATH, []);
    return [];
  }
  try {
    const data = await fs.readJSON(STORE_PATH);
    if (Array.isArray(data)) {
      return data as VoiceVectorRecord[];
    }
    return [];
  } catch (err) {
    logger.error("Failed to read local chroma store, recreating", { err });
    await fs.writeJSON(STORE_PATH, []);
    return [];
  }
}

async function saveStore(records: VoiceVectorRecord[]): Promise<void> {
  await fs.writeJSON(STORE_PATH, records, { spaces: 2 });
}

export async function chromaAdd(record: VoiceVectorRecord): Promise<void> {
  const records = await ensureStore();
  records.push(record);
  await saveStore(records);
}

export interface ChromaQueryParams {
  telegramUserId: string;
  queryEmbedding: number[];
  topK: number;
}

export interface ChromaQueryResult extends VoiceVectorRecord {
  similarity: number;
}

export async function chromaQuery(
  params: ChromaQueryParams,
): Promise<ChromaQueryResult[]> {
  const { telegramUserId, queryEmbedding, topK } = params;
  const records = await ensureStore();
  const filtered = records.filter(
    (r) => r.metadata.telegramUserId === telegramUserId,
  );

  const scored = filtered.map((r) => ({
    ...r,
    similarity: cosineSimilarity(queryEmbedding, r.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, topK);
}


