import { createClient } from "@libsql/client";

export function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

export async function initDb() {
  const db = getDb();
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      image TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      anime_id TEXT NOT NULL,
      episode_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_spoiler INTEGER DEFAULT 0,
      parent_id INTEGER DEFAULT NULL,
      username TEXT,
      user_avatar TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS comment_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      type INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(comment_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      anime_id TEXT NOT NULL,
      anime_name TEXT NOT NULL,
      poster TEXT,
      anilist_id TEXT,
      episode_number INTEGER NOT NULL DEFAULT 1,
      watched_episodes TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, anime_id)
    )`,
    `CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      anime_id TEXT NOT NULL,
      anime_name TEXT NOT NULL,
      poster TEXT,
      type INTEGER NOT NULL DEFAULT 1,
      anilist_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, anime_id)
    )`,
    `CREATE TABLE IF NOT EXISTS pageview (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id TEXT NOT NULL UNIQUE,
      total_views INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      dislike_count INTEGER DEFAULT 0
    )`,
  ];
  for (const sql of tables) {
    await db.execute(sql);
  }
  // migrate: add anime_name to comments if missing
  await db.execute("ALTER TABLE comments ADD COLUMN anime_name TEXT").catch(() => {});
}

export async function getUserFromRequest(request) {
  const token = request.cookies.get("fa_session")?.value;
  if (!token) return null;
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT u.id, u.username, u.email, u.image
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token = ? AND s.expires_at > datetime('now')`,
    args: [token],
  });
  return result.rows[0] || null;
}
