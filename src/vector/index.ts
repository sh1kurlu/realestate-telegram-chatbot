import { v4 as uuidv4 } from "uuid";
import { embedText } from "./embeddings";
import {
  chromaAdd,
  chromaQuery,
  VoiceVectorMetadata,
  VoiceVectorRecord,
} from "./chroma";
import { pineconeUpsert, pineconeQuery } from "./pinecone";
import { logger } from "../config/logger";

export async function storeVoiceVector(options: {
  text: string;
  telegramUserId: string;
  chatId: string;
  detectedLanguage: "az" | "en" | "unknown";
  detectedIntent?: string;
  clientName?: string;
  meetingDateTime?: string;
}): Promise<void> {
  const embedding = await embedText(options.text);
  const id = uuidv4();

  const metadata: VoiceVectorMetadata = {
    source: "voice",
    telegramUserId: options.telegramUserId,
    chatId: options.chatId,
    timestamp: new Date().toISOString(),
    rawText: options.text,
    detectedLanguage: options.detectedLanguage,
    detectedIntent: options.detectedIntent,
    clientName: options.clientName,
    meetingDateTime: options.meetingDateTime,
  };

  const record: VoiceVectorRecord = {
    id,
    embedding,
    metadata,
  };

  await chromaAdd(record);
  await pineconeUpsert(id, embedding, metadata);
}

export async function queryVoiceContext(options: {
  text: string;
  telegramUserId: string;
  topK?: number;
}): Promise<string | null> {
  const topK = options.topK ?? 5;
  const embedding = await embedText(options.text);

  // First query local Chroma-style store
  const chromaResults = await chromaQuery({
    telegramUserId: options.telegramUserId,
    queryEmbedding: embedding,
    topK,
  });

  let combinedContext = chromaResults.map(
    (r) =>
      `similarity=${r.similarity.toFixed(
        3,
      )}, text="${r.metadata.rawText}", clientName="${
        r.metadata.clientName ?? ""
      }", meetingDateTime="${r.metadata.meetingDateTime ?? ""}"`,
  );

  const bestLocalSim =
    chromaResults.length > 0 ? chromaResults[0].similarity : 0;

  // Optional Pinecone fallback / augmentation
  try {
    const pineconeResults = await pineconeQuery(
      options.telegramUserId,
      embedding,
      topK,
    );
    if (pineconeResults.length > 0) {
      combinedContext = combinedContext.concat(
        pineconeResults.map(
          (r) =>
            `pineconeScore=${(r.score ?? 0).toFixed(
              3,
            )}, text="${r.metadata?.rawText ?? ""}", clientName="${
              r.metadata?.clientName ?? ""
            }", meetingDateTime="${r.metadata?.meetingDateTime ?? ""}"`,
        ),
      );
    }
  } catch (err) {
    logger.warn("Pinecone query failed, continuing with local context only", {
      err,
    });
  }

  // Confidence logic: if best local similarity is below 0.85, do not provide context
  // so that the workflow will ask for clarification instead of auto-filling.
  if (combinedContext.length === 0 || bestLocalSim < 0.85) {
    return null;
  }

  return combinedContext.join("\n");
}


