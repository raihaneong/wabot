import Database from "better-sqlite3";
import fs from "fs";

if (!fs.existsSync("./data")) {
  fs.mkdirSync("./data");
}

const db = new Database("./data/db.sqlite");


db.exec(`
CREATE TABLE IF NOT EXISTS listened_groups(
  id TEXT PRIMARY KEY,
  name TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE IF NOT EXISTS afk_status (
  user_id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  since_ts INTEGER NOT NULL,
  chat_id TEXT
);
`);

const upsertAfkStmt = db.prepare(`
  INSERT INTO afk_status (user_id, message, since_ts, chat_id)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    message = excluded.message,
    since_ts = excluded.since_ts,
    chat_id = excluded.chat_id
`);

const getAfkStmt = db.prepare(`
  SELECT user_id, message, since_ts, chat_id
  FROM afk_status
  WHERE user_id = ?
`);

const deleteAfkStmt = db.prepare(`
  DELETE FROM afk_status
  WHERE user_id = ?
`);

const listAfkByChatStmt = db.prepare(`
  SELECT user_id, message, since_ts, chat_id
  FROM afk_status
  WHERE chat_id = ?
  ORDER BY since_ts ASC
`);

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._serialized || "";
}

function setAfk(userId, message, chatId = null) {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return;
  upsertAfkStmt.run(normalizedUserId, message, Date.now(), chatId);
}

function getAfk(userId) {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return null;
  return getAfkStmt.get(normalizedUserId) || null;
}

function clearAfk(userId) {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return;
  deleteAfkStmt.run(normalizedUserId);
}

function listAfkByChat(chatId) {
  const normalizedChatId = normalizeId(chatId);
  if (!normalizedChatId) return [];
  return listAfkByChatStmt.all(normalizedChatId);
}

export { db, setAfk, getAfk, clearAfk, listAfkByChat };
