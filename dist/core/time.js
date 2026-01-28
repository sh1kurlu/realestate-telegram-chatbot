"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBakuIso = ensureBakuIso;
// Helper to normalize to a valid ISO string.
// We assume the LLM already returns an ISO-like datetime in Asia/Baku.
// Here we just validate and normalize; if parsing fails, we fall back to "now".
function ensureBakuIso(isoOrNatural) {
    const parsed = new Date(isoOrNatural);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
    }
    return new Date().toISOString();
}
//# sourceMappingURL=time.js.map