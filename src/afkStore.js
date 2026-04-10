const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const dbPath = path.join(__dirname, "..", "data.sqlite");
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS afk_status (
    user_id TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    since_ts INTEGER NOT NULL,
    chat_id TEXT
  );
`);

const upsertStmt = db.prepare(`
  INSERT INTO afk_status (user_id, message, since_ts, chat_id)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    message = excluded.message,
    since_ts = excluded.since_ts,
    chat_id = excluded.chat_id
`);

const getStmt = db.prepare(`
  SELECT user_id, message, since_ts, chat_id
  FROM afk_status
  WHERE user_id = ?
`);

const deleteStmt = db.prepare(`
  DELETE FROM afk_status
  WHERE user_id = ?
`);

const listByChatStmt = db.prepare(`
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
  upsertStmt.run(normalizedUserId, message, Date.now(), chatId);
}

function getAfk(userId) {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return null;
  return getStmt.get(normalizedUserId) || null;
}

function clearAfk(userId) {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return;
  deleteStmt.run(normalizedUserId);
}

function listAfkByChat(chatId) {
  const normalizedChatId = normalizeId(chatId);
  if (!normalizedChatId) return [];
  return listByChatStmt.all(normalizedChatId);
}

module.exports = {
  setAfk,
  getAfk,
  clearAfk,
  listAfkByChat,
};
