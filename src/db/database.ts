import * as SQLite from 'expo-sqlite';

const DB_NAME = 'tally.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens (once) and migrates the database. Every data helper funnels through
 * here so migrations are guaranteed to have run before the first query.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

const MIGRATIONS: ((db: SQLite.SQLiteDatabase) => Promise<void>)[] = [
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'daily',
        weekdays TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
        reminder_minutes INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS completions (
        id INTEGER PRIMARY KEY NOT NULL,
        habit_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        completed_at INTEGER NOT NULL,
        FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_completions_habit_day
        ON completions (habit_id, day);
      CREATE INDEX IF NOT EXISTS idx_completions_day ON completions (day);

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  },

  // v2 — archiving, and habits that count rather than just tick.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE habits ADD COLUMN archived_at TEXT;
      ALTER TABLE habits ADD COLUMN target_count INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE habits ADD COLUMN unit TEXT;
      ALTER TABLE completions ADD COLUMN count INTEGER NOT NULL DEFAULT 1;
    `);
  },
];

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;

  while (version < MIGRATIONS.length) {
    await MIGRATIONS[version](db);
    version += 1;
    // PRAGMA does not accept bound parameters, and `version` is a loop counter
    // we control, so interpolation is safe here.
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}

/** Wipes user data. Used by "Reset all data" in Settings. */
export async function resetAllData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('DELETE FROM completions; DELETE FROM habits;');
}
