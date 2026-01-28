"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedText = embedText;
exports.cosineSimilarity = cosineSimilarity;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../config/env");
const openai = new openai_1.default({
    apiKey: env_1.env.openaiApiKey,
});
async function embedText(text) {
    const res = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text,
    });
    return res.data[0].embedding;
}
function cosineSimilarity(a, b) {
    const len = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0)
        return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
//# sourceMappingURL=embeddings.js.map