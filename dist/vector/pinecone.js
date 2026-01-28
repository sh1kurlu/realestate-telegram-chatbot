"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pineconeUpsert = pineconeUpsert;
exports.pineconeQuery = pineconeQuery;
const pinecone_1 = require("@pinecone-database/pinecone");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
let pineconeClient = null;
function getPinecone() {
    if (!env_1.env.pineconeApiKey || !env_1.env.pineconeIndex)
        return null;
    if (!pineconeClient) {
        pineconeClient = new pinecone_1.Pinecone({ apiKey: env_1.env.pineconeApiKey });
    }
    return pineconeClient;
}
async function pineconeUpsert(id, embedding, metadata) {
    const client = getPinecone();
    if (!client)
        return;
    try {
        const index = client.index(env_1.env.pineconeIndex);
        await index.upsert([
            {
                id,
                values: embedding,
                metadata,
            },
        ]);
    }
    catch (err) {
        logger_1.logger.error("Pinecone upsert failed", { err });
    }
}
async function pineconeQuery(userId, embedding, topK) {
    const client = getPinecone();
    if (!client)
        return [];
    try {
        const index = client.index(env_1.env.pineconeIndex);
        const res = await index.query({
            topK,
            vector: embedding,
            includeMetadata: true,
            filter: {
                telegramUserId: userId,
            },
        });
        return (res.matches?.map((m) => ({
            id: m.id,
            score: m.score ?? 0,
            metadata: m.metadata,
        })) ?? []);
    }
    catch (err) {
        logger_1.logger.error("Pinecone query failed", { err });
        return [];
    }
}
//# sourceMappingURL=pinecone.js.map