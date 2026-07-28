/**
 * Export and import.
 *
 * The export format is deliberately plain: a readable JSON document a person
 * can open, diff, or hand-edit. Import validates the entire payload before a
 * single record is written, so a malformed file can never leave the library
 * half-migrated.
 */

import { STATUSES, cleanCapo, cleanTags } from "./store.js";
import type { Status, Song, Instrument } from "./store.js";

export const BACKUP_VERSION = 2;

/**
 * Versions this app can still read. A backup you exported before capo and
 * tags existed must keep working forever; dropping v1 would quietly strand
 * every file already sitting in someone's downloads folder.
 */
export const READABLE_VERSIONS = [1, 2];

export function serialize(data: {
  songs: Song[];
  instruments: Instrument[];
}): string {
  return JSON.stringify(
    {
      app: "songunlocked",
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      instruments: data.instruments,
      songs: data.songs,
    },
    null,
    2,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateInstrument(
  raw: unknown,
  index: number,
): Instrument {
  const at = `instruments[${index}]`;
  if (!isPlainObject(raw)) throw new Error(`${at} is not an object.`);
  if (typeof raw.id !== "string" || !raw.id)
    throw new Error(`${at} is missing an id.`);
  if (typeof raw.name !== "string" || !raw.name.trim())
    throw new Error(`${at} is missing a name.`);

  return {
    id: raw.id,
    name: String(raw.name).trim(),
    archived: Boolean(raw.archived),
    createdAt:
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : new Date().toISOString(),
  };
}

function validateSong(
  raw: unknown,
  index: number,
  knownInstruments: Set<string>,
): Song {
  const at = `songs[${index}]`;
  if (!isPlainObject(raw)) throw new Error(`${at} is not an object.`);
  if (typeof raw.id !== "string" || !raw.id)
    throw new Error(`${at} is missing an id.`);
  if (typeof raw.title !== "string" || !raw.title.trim())
    throw new Error(`${at} is missing a title.`);

  const status: Status = (STATUSES as readonly string[]).includes(
    raw.status as string,
  )
    ? (raw.status as Status)
    : "to_learn";

  if (
    typeof raw.instrumentId !== "string" ||
    !knownInstruments.has(raw.instrumentId)
  ) {
    throw new Error(
      `${at} ("${String(raw.title).slice(0, 40)}") points at an instrument that is not in this file.`,
    );
  }

  const timestamp =
    typeof raw.updatedAt === "string"
      ? raw.updatedAt
      : new Date().toISOString();

  return {
    id: raw.id,
    title: String(raw.title).trim(),
    artist: typeof raw.artist === "string" ? raw.artist.trim() : "",
    instrumentId: raw.instrumentId,
    status,
    // Absent in v1 files: default rather than reject.
    capo: cleanCapo(raw.capo),
    tags: cleanTags(raw.tags),
    content: typeof raw.content === "string" ? raw.content : "",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Parse and validate a backup document.
 * Throws a human-readable Error on any problem; never returns partial data.
 */
export function parseBackup(text: string): {
  songs: Song[];
  instruments: Instrument[];
} {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("That file is empty.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  if (!isPlainObject(raw)) {
    throw new Error("A backup must be a JSON object.");
  }

  if (raw.version === undefined) {
    throw new Error("This file has no version field, so it is not a backup.");
  }

  if (!READABLE_VERSIONS.includes(raw.version as number)) {
    throw new Error(
      `Backup version ${String(raw.version)} is not supported. This app reads version ${READABLE_VERSIONS.join(" and ")}.`,
    );
  }

  if (!Array.isArray(raw.instruments)) {
    throw new Error("This backup is missing its instruments list.");
  }

  if (!Array.isArray(raw.songs)) {
    throw new Error("This backup is missing its songs list.");
  }

  const instruments = (raw.instruments as unknown[]).map(validateInstrument);
  const ids = new Set(instruments.map((item) => item.id));
  const songs = (raw.songs as unknown[]).map((song, index) =>
    validateSong(song, index, ids),
  );

  const uniqueSongIds = new Set(songs.map((song) => song.id));
  if (uniqueSongIds.size !== songs.length) {
    throw new Error("This backup contains duplicate song ids.");
  }

  return { songs, instruments };
}

export function downloadFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function backupFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `songunlocked-${stamp}.json`;
}
