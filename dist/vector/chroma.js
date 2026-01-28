"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chromaAdd = chromaAdd;
exports.chromaQuery = chromaQuery;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const embeddings_1 = require("./embeddings");
const logger_1 = require("../config/logger");
const DATA_DIR = path_1.default.join(process.cwd(), "data", "chroma");
const STORE_PATH = path_1.default.join(DATA_DIR, "store.json");
async function ensureStore() {
    await fs_extra_1.default.ensureDir(DATA_DIR);
    if (!(await fs_extra_1.default.pathExists(STORE_PATH))) {
        await fs_extra_1.default.writeJSON(STORE_PATH, []);
        return [];
    }
    try {
        const data = await fs_extra_1.default.readJSON(STORE_PATH);
        if (Array.isArray(data)) {
            return data;
        }
        return [];
    }
    catch (err) {
        logger_1.logger.error("Failed to read local chroma store, recreating", { err });
        await fs_extra_1.default.writeJSON(STORE_PATH, []);
        return [];
    }
}
async function saveStore(records) {
    await fs_extra_1.default.writeJSON(STORE_PATH, records, { spaces: 2 });
}
async function chromaAdd(record) {
    const records = await ensureStore();
    records.push(record);
    await saveStore(records);
}
async function chromaQuery(params) {
    const { telegramUserId, queryEmbedding, topK } = params;
    const records = await ensureStore();
    const filtered = records.filter((r) => r.metadata.telegramUserId === telegramUserId);
    const scored = filtered.map((r) => ({
        ...r,
        similarity: (0, embeddings_1.cosineSimilarity)(queryEmbedding, r.embedding),
    }));
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
}
//# sourceMappingURL=chroma.js.map