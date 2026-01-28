import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "../config/env";
import { VoiceVectorMetadata } from "./chroma";
import { logger } from "../config/logger";

let pineconeClient: Pinecone | null = null;

function getPinecone(): Pinecone | null {
  if (!env.pineconeApiKey || !env.pineconeIndex) return null;
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: env.pineconeApiKey });
  }
  return pineconeClient;
}

export async function pineconeUpsert(
  id: string,
  embedding: number[],
  metadata: VoiceVectorMetadata,
): Promise<void> {
  const client = getPinecone();
  if (!client) return;

  try {
    const index = client.index(env.pineconeIndex);
    await index.upsert([
      {
        id,
        values: embedding,
        metadata,
      } as any,
    ]);
  } catch (err) {
    logger.error("Pinecone upsert failed", { err });
  }
}

export interface PineconeQueryResult {
  id: string;
  score: number;
  metadata?: VoiceVectorMetadata;
}

export async function pineconeQuery(
  userId: string,
  embedding: number[],
  topK: number,
): Promise<PineconeQueryResult[]> {
  const client = getPinecone();
  if (!client) return [];

  try {
    const index = client.index(env.pineconeIndex);
    const res = await index.query({
      topK,
      vector: embedding,
      includeMetadata: true,
      filter: {
        telegramUserId: userId,
      } as any,
    });

    return (
      res.matches?.map((m) => ({
        id: m.id,
        score: m.score ?? 0,
        metadata: m.metadata as VoiceVectorMetadata | undefined,
      })) ?? []
    );
  } catch (err) {
    logger.error("Pinecone query failed", { err });
    return [];
  }
}


