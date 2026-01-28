interface ConversationState {
  lastParsedInfo?: any;
  awaitingFields?: string[];
}

const stateStore = new Map<string, ConversationState>();

function key(userId: string, chatId: string): string {
  return `${userId}:${chatId}`;
}

export function getConversationState(
  userId: string,
  chatId: string,
): ConversationState | undefined {
  return stateStore.get(key(userId, chatId));
}

export function setConversationState(
  userId: string,
  chatId: string,
  state: ConversationState,
): void {
  stateStore.set(key(userId, chatId), state);
}

export function clearConversationState(userId: string, chatId: string): void {
  stateStore.delete(key(userId, chatId));
}


