import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../config/logger";

export interface Reminder {
  id: string;
  chatId: string;
  message: string;
  dueAt: string; // ISO
  sent: boolean;
}

const REMINDERS_PATH = path.join(process.cwd(), "data", "reminders.json");

async function ensureStore(): Promise<Reminder[]> {
  await fs.ensureDir(path.dirname(REMINDERS_PATH));
  if (!(await fs.pathExists(REMINDERS_PATH))) {
    await fs.writeJSON(REMINDERS_PATH, [], { spaces: 2 });
    return [];
  }
  try {
    const data = await fs.readJSON(REMINDERS_PATH);
    return (data as Reminder[]) || [];
  } catch (err) {
    logger.error("Failed to read reminders store, recreating", { err });
    await fs.writeJSON(REMINDERS_PATH, [], { spaces: 2 });
    return [];
  }
}

async function saveStore(reminders: Reminder[]) {
  await fs.writeJSON(REMINDERS_PATH, reminders, { spaces: 2 });
}

export async function addReminder(options: {
  chatId: string;
  message: string;
  dueAt: string;
}): Promise<Reminder> {
  const reminders = await ensureStore();
  const reminder: Reminder = {
    id: uuidv4(),
    chatId: options.chatId,
    message: options.message,
    dueAt: options.dueAt,
    sent: false,
  };
  reminders.push(reminder);
  await saveStore(reminders);
  return reminder;
}

export async function getDueReminders(): Promise<Reminder[]> {
  const reminders = await ensureStore();
  const now = new Date();
  return reminders.filter(
    (r) => !r.sent && new Date(r.dueAt).getTime() <= now.getTime(),
  );
}

export async function markReminderSent(id: string): Promise<void> {
  const reminders = await ensureStore();
  const updated = reminders.map((r) =>
    r.id === id ? { ...r, sent: true } : r,
  );
  await saveStore(updated);
}


