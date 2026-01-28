"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversationState = getConversationState;
exports.setConversationState = setConversationState;
exports.clearConversationState = clearConversationState;
const stateStore = new Map();
function key(userId, chatId) {
    return `${userId}:${chatId}`;
}
function getConversationState(userId, chatId) {
    return stateStore.get(key(userId, chatId));
}
function setConversationState(userId, chatId, state) {
    stateStore.set(key(userId, chatId), state);
}
function clearConversationState(userId, chatId) {
    stateStore.delete(key(userId, chatId));
}
//# sourceMappingURL=state.js.map