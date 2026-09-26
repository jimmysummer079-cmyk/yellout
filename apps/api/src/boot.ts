import { openDatabase, setDb, type Db } from './db/index.js';

export function bootDatabase(dbPath?: string): Db {
  const db = openDatabase(dbPath);
  setDb(db);
  return db;
}
