"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addReminder = addReminder;
exports.getDueReminders = getDueReminders;
exports.markReminderSent = markReminderSent;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const logger_1 = require("../config/logger");
const REMINDERS_PATH = path_1.default.join(process.cwd(), "data", "reminders.json");
async function ensureStore() {
    await fs_extra_1.default.ensureDir(path_1.default.dirname(REMINDERS_PATH));
    if (!(await fs_extra_1.default.pathExists(REMINDERS_PATH))) {
        await fs_extra_1.default.writeJSON(REMINDERS_PATH, [], { spaces: 2 });
        return [];
    }
    try {
        const data = await fs_extra_1.default.readJSON(REMINDERS_PATH);
        return data || [];
    }
    catch (err) {
        logger_1.logger.error("Failed to read reminders store, recreating", { err });
        await fs_extra_1.default.writeJSON(REMINDERS_PATH, [], { spaces: 2 });
        return [];
    }
}
async function saveStore(reminders) {
    await fs_extra_1.default.writeJSON(REMINDERS_PATH, reminders, { spaces: 2 });
}
async function addReminder(options) {
    const reminders = await ensureStore();
    const reminder = {
        id: (0, uuid_1.v4)(),
        chatId: options.chatId,
        message: options.message,
        dueAt: options.dueAt,
        sent: false,
    };
    reminders.push(reminder);
    await saveStore(reminders);
    return reminder;
}
async function getDueReminders() {
    const reminders = await ensureStore();
    const now = new Date();
    return reminders.filter((r) => !r.sent && new Date(r.dueAt).getTime() <= now.getTime());
}
async function markReminderSent(id) {
    const reminders = await ensureStore();
    const updated = reminders.map((r) => r.id === id ? { ...r, sent: true } : r);
    await saveStore(updated);
}
//# sourceMappingURL=reminderStore.js.map