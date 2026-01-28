"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeVoiceVector = storeVoiceVector;
exports.queryVoiceContext = queryVoiceContext;
const uuid_1 = require("uuid");
const embeddings_1 = require("./embeddings");
const chroma_1 = require("./chroma");
const pinecone_1 = require("./pinecone");
const logger_1 = require("../config/logger");
async function storeVoiceVector(options) {
    const embedding = await (0, embeddings_1.embedText)(options.text);
    const id = (0, uuid_1.v4)();
    const metadata = {
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
    const record = {
        id,
        embedding,
        metadata,
    };
    await (0, chroma_1.chromaAdd)(record);
    await (0, pinecone_1.pineconeUpsert)(id, embedding, metadata);
}
async function queryVoiceContext(options) {
    const topK = options.topK ?? 5;
    const embedding = await (0, embeddings_1.embedText)(options.text);
    // First query local Chroma-style store
    const chromaResults = await (0, chroma_1.chromaQuery)({
        telegramUserId: options.telegramUserId,
        queryEmbedding: embedding,
        topK,
    });
    let combinedContext = chromaResults.map((r) => `similarity=${r.similarity.toFixed(3)}, text="${r.metadata.rawText}", clientName="${r.metadata.clientName ?? ""}", meetingDateTime="${r.metadata.meetingDateTime ?? ""}"`);
    const bestLocalSim = chromaResults.length > 0 ? chromaResults[0].similarity : 0;
    // Optional Pinecone fallback / augmentation
    try {
        const pineconeResults = await (0, pinecone_1.pineconeQuery)(options.telegramUserId, embedding, topK);
        if (pineconeResults.length > 0) {
            combinedContext = combinedContext.concat(pineconeResults.map((r) => `pineconeScore=${(r.score ?? 0).toFixed(3)}, text="${r.metadata?.rawText ?? ""}", clientName="${r.metadata?.clientName ?? ""}", meetingDateTime="${r.metadata?.meetingDateTime ?? ""}"`));
        }
    }
    catch (err) {
        logger_1.logger.warn("Pinecone query failed, continuing with local context only", {
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
//# sourceMappingURL=index.js.map