import Databse from "better-sqlite3";
const db = new Databse("./db.sqlite");

db.exec(`
CREATE TABLE IF NOT EXISTS listened_groups(
  id TEXT PRIMARY KEY,
  name TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP

);
`);

export { db };
