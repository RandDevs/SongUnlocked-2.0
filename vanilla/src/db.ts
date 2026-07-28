/**
 * IndexedDB access layer, written by hand.
 *
 * A wrapper library would be ~12KB of dependency for the six operations this
 * app actually performs. Everything below is promise-based and transaction-safe:
 * a write either completes fully or leaves the database untouched.
 */

export const DB_NAME = "songunlocked";
export const DB_VERSION = 2;
export const SONGS = "songs";
export const INSTRUMENTS = "instruments";

let connection: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (connection) return connection;

  connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains(INSTRUMENTS)) {
        db.createObjectStore(INSTRUMENTS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(SONGS)) {
        const songs = db.createObjectStore(SONGS, { keyPath: "id" });
        songs.createIndex("byInstrument", "instrumentId");
        songs.createIndex("byUpdated", "updatedAt");
      }

      // v1 -> v2 adds capo and tags. Songs written before this version are
      // rewritten here, inside the upgrade transaction, so no other code in
      // the app ever has to defend against a song missing these fields.
      if (event.oldVersion > 0 && event.oldVersion < 2) {
        const tx = request.transaction;
        if (!tx) return;
        const songs = tx.objectStore(SONGS);
        songs.openCursor().onsuccess = (cursorEvent) => {
          const cursor = (
            cursorEvent.target as IDBRequest<IDBCursorWithValue | null>
          ).result;
          if (!cursor) return;
          const song = cursor.value;
          let changed = false;
          if (typeof song.capo !== "number") {
            song.capo = 0;
            changed = true;
          }
          if (!Array.isArray(song.tags)) {
            song.tags = [];
            changed = true;
          }
          if (changed) cursor.update(song);
          cursor.continue();
        };
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // If another tab upgrades the schema, drop our handle so it can proceed.
      db.onversionchange = () => {
        db.close();
        connection = null;
      };
      resolve(db);
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Database upgrade blocked by another open tab."));
  });

  return connection;
}

function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function settled(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export async function readAll(store: string): Promise<unknown[]> {
  const db = await open();
  return wrap(db.transaction(store, "readonly").objectStore(store).getAll());
}

export async function save<T>(store: string, record: T): Promise<T> {
  const db = await open();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(record);
  await settled(tx);
  return record;
}

export async function remove(store: string, id: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(id);
  await settled(tx);
}

/**
 * Replace the full contents of both stores in a single transaction.
 * Used by "import as replace": if anything throws, nothing is written.
 */
export async function replaceEverything(data: {
  songs: unknown[];
  instruments: unknown[];
}): Promise<void> {
  const db = await open();
  const tx = db.transaction([SONGS, INSTRUMENTS], "readwrite");
  const songs = tx.objectStore(SONGS);
  const instruments = tx.objectStore(INSTRUMENTS);

  songs.clear();
  instruments.clear();
  for (const song of data.songs) songs.put(song);
  for (const instrument of data.instruments) instruments.put(instrument);

  await settled(tx);
}

/**
 * Upsert many records across both stores atomically.
 */
export async function saveEverything(data: {
  songs: unknown[];
  instruments: unknown[];
}): Promise<void> {
  const db = await open();
  const tx = db.transaction([SONGS, INSTRUMENTS], "readwrite");
  const songs = tx.objectStore(SONGS);
  const instruments = tx.objectStore(INSTRUMENTS);

  for (const song of data.songs) songs.put(song);
  for (const instrument of data.instruments) instruments.put(instrument);

  await settled(tx);
}

/** Wipe all user data. */
export async function wipe(): Promise<void> {
  const db = await open();
  const tx = db.transaction([SONGS, INSTRUMENTS], "readwrite");
  tx.objectStore(SONGS).clear();
  tx.objectStore(INSTRUMENTS).clear();
  await settled(tx);
}

/** Release the connection. Used by tests. */
export async function close(): Promise<void> {
  if (!connection) return;
  const db = await connection;
  db.close();
  connection = null;
}
