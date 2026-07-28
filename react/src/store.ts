/**
 * Application state.
 *
 * The whole library is small enough to live in memory, so reads are synchronous
 * and instant. IndexedDB is the durable copy: every mutation writes there first,
 * then updates memory, then notifies subscribers. If a write fails, memory is
 * never touched, so the UI can never show data that was not persisted.
 */

import * as db from "./db.js";
import { seedInstruments, seedSongs } from "./seed.js";

export type Status = "to_learn" | "mastered";

export interface Song {
  id: string;
  title: string;
  artist: string;
  instrumentId: string;
  status: Status;
  capo: number;
  tags: string[];
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Instrument {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
}

export const STATUSES: readonly Status[] = ["to_learn", "mastered"] as const;

export function statusLabel(status: Status): string {
  return status === "mastered" ? "Mastered" : "To Learn";
}

/**
 * Starting vocabulary for moods. Kept short on purpose: a long preset list
 * stops being a set of choices and turns into a writing prompt, and the whole
 * point of a tag is that two songs can share it.
 */
export const TAG_PRESETS: string[] = [
  "Sad",
  "Love",
  "Happy",
  "Nostalgic",
  "Chill",
  "Upbeat",
  "Campfire",
];

/** Past this, tags stop narrowing anything and become notes. */
export const MAX_TAGS = 5;

/** Highest capo position offered. Past 7 the neck runs out of usable frets. */
export const MAX_CAPO = 7;

/**
 * Display spelling: trimmed, inner runs of whitespace collapsed.
 */
export function normalizeTag(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

/**
 * Comparison key. "sad", "Sad" and " SAD " are one tag, and the first spelling
 * you typed is the one that gets shown.
 */
export function tagKey(raw: unknown): string {
  return normalizeTag(raw).toLowerCase();
}

export function cleanTags(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Map<string, string>();
  for (const raw of list) {
    const label = normalizeTag(raw);
    if (!label) continue;
    const key = label.toLowerCase();
    if (!seen.has(key)) seen.set(key, label);
    if (seen.size >= MAX_TAGS) break;
  }
  return [...seen.values()];
}

export function cleanCapo(value: unknown): number {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(MAX_CAPO, number);
}

/**
 * Fill in fields a song from an older schema will not have. Import and legacy
 * rows both pass through here.
 */
export function normalizeSong(song: Record<string, unknown>): Song {
  const base = song as unknown as Song;
  return {
    ...base,
    capo: cleanCapo(song?.capo),
    tags: cleanTags(song?.tags),
  };
}

const state: { songs: Song[]; instruments: Instrument[]; ready: boolean } = {
  songs: [],
  instruments: [],
  ready: false,
};

const listeners = new Set<() => void>();
let version = 0;

function notify(): void {
  version++;
  for (const listener of listeners) listener();
}

export const getVersion = (): number => version;

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function newId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const now = (): string => new Date().toISOString();

/** Load from disk, seeding a first-time library. */
export async function init(): Promise<void> {
  const [songs, instruments] = await Promise.all([
    db.readAll(db.SONGS),
    db.readAll(db.INSTRUMENTS),
  ]);

  if (songs.length === 0 && instruments.length === 0) {
    const seeded = { songs: seedSongs(), instruments: seedInstruments() };
    await db.saveEverything(seeded);
    state.songs = seeded.songs;
    state.instruments = seeded.instruments;
  } else {
    // Defensive: a row written by an older build should never reach the views
    // half-shaped, even if the schema upgrade was interrupted.
    state.songs = (songs as Record<string, unknown>[]).map(normalizeSong);
    state.instruments = instruments as Instrument[];
  }

  state.ready = true;
  notify();
}

/* ---------- Reads ---------- */

export const getSongs = (): Song[] => state.songs;
export const getInstruments = (): Instrument[] => state.instruments;
export const getActiveInstruments = (): Instrument[] =>
  state.instruments.filter((i) => !i.archived);

export function getSong(id: string): Song | null {
  return state.songs.find((song) => song.id === id) || null;
}

export function getInstrument(id: string): Instrument | null {
  return state.instruments.find((item) => item.id === id) || null;
}

export function instrumentName(id: string): string {
  return getInstrument(id)?.name || "Unassigned";
}

export function songCountFor(instrumentId: string): number {
  return state.songs.filter((song) => song.instrumentId === instrumentId)
    .length;
}

/**
 * Mastery tally per active instrument.
 */
export function masteryStats(): Array<{
  instrument: Instrument;
  mastered: number;
  toLearn: number;
  total: number;
}> {
  return getActiveInstruments().map((instrument) => {
    const songs = state.songs.filter(
      (song) => song.instrumentId === instrument.id,
    );
    const mastered = songs.filter((song) => song.status === "mastered").length;
    return {
      instrument,
      mastered,
      toLearn: songs.length - mastered,
      total: songs.length,
    };
  });
}

/**
 * Every capo position actually present in the library, lowest first.
 * The filter row is built from this rather than from 0..7, so it never offers
 * a position that would return nothing.
 */
export function capoValues(): number[] {
  return [...new Set(state.songs.map((song) => cleanCapo(song.capo)))].sort(
    (a, b) => a - b,
  );
}

/**
 * Tags in use, most used first, ties broken alphabetically.
 */
export function tagsInUse(): Array<{ label: string; count: number }> {
  const tally = new Map<string, { label: string; count: number }>();
  for (const song of state.songs) {
    for (const tag of cleanTags(song.tags)) {
      const key = tag.toLowerCase();
      const entry = tally.get(key);
      if (entry) entry.count += 1;
      else tally.set(key, { label: tag, count: 1 });
    }
  }
  return [...tally.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

/**
 * Presets plus anything already in use, deduplicated. Offered in the editor.
 */
export function suggestedTags(): string[] {
  const merged = new Map<string, string>();
  for (const preset of TAG_PRESETS) merged.set(preset.toLowerCase(), preset);
  for (const { label } of tagsInUse()) {
    if (!merged.has(label.toLowerCase()))
      merged.set(label.toLowerCase(), label);
  }
  return [...merged.values()];
}

/**
 * Search and filter, newest activity first.
 *
 * Categories combine with AND, but tags combine with OR inside their own
 * category: "guitar, no capo, (Sad or Love)" is the question actually being
 * asked when you are picking a song for a room full of people.
 */
export function findSongs(
  options: {
    query?: string;
    instrumentId?: string;
    status?: Status | "all";
    capo?: number | "all";
    tags?: string[];
  } = {},
): Song[] {
  const query = (options.query || "").trim().toLowerCase();
  const instrumentId = options.instrumentId || "all";
  const status = options.status || "all";
  const capo = options.capo === undefined ? "all" : options.capo;
  const tags = (options.tags || []).map(tagKey).filter(Boolean);

  return state.songs
    .filter((song) => {
      if (instrumentId !== "all" && song.instrumentId !== instrumentId)
        return false;
      if (status !== "all" && song.status !== status) return false;
      if (capo !== "all" && cleanCapo(song.capo) !== capo) return false;

      if (tags.length > 0) {
        const own = new Set(
          cleanTags(song.tags).map((tag) => tag.toLowerCase()),
        );
        if (!tags.some((tag) => own.has(tag))) return false;
      }

      if (!query) return true;
      return (
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/* ---------- Song mutations ---------- */

export async function addSong(input: {
  title: string;
  artist?: string;
  instrumentId: string;
  status?: Status;
  capo?: number;
  tags?: string[];
  content?: string;
}): Promise<Song> {
  const title = input.title.trim();
  if (!title) throw new Error("A song needs a title.");
  if (!input.instrumentId) throw new Error("Pick an instrument first.");

  const timestamp = now();
  const song: Song = {
    id: newId(),
    title,
    artist: (input.artist || "").trim(),
    instrumentId: input.instrumentId,
    status: input.status || "mastered",
    capo: cleanCapo(input.capo),
    tags: cleanTags(input.tags),
    content: input.content || "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.save(db.SONGS, song);
  state.songs = [...state.songs, song];
  notify();
  return song;
}

export async function updateSong(
  id: string,
  patch: Partial<Omit<Song, "id" | "createdAt">>,
): Promise<Song> {
  const current = getSong(id);
  if (!current) throw new Error("That song no longer exists.");

  if (patch.title !== undefined && !patch.title.trim()) {
    throw new Error("A song needs a title.");
  }

  const next: Song = {
    ...current,
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() : current.title,
    artist: patch.artist !== undefined ? patch.artist.trim() : current.artist,
    capo: cleanCapo(patch.capo !== undefined ? patch.capo : current.capo),
    tags: cleanTags(patch.tags !== undefined ? patch.tags : current.tags),
    updatedAt: now(),
  };

  await db.save(db.SONGS, next);
  state.songs = state.songs.map((song) => (song.id === id ? next : song));
  notify();
  return next;
}

export async function toggleStatus(id: string): Promise<Song> {
  const song = getSong(id);
  if (!song) throw new Error("That song no longer exists.");
  return updateSong(id, {
    status: song.status === "mastered" ? "to_learn" : "mastered",
  });
}

export async function deleteSong(id: string): Promise<void> {
  await db.remove(db.SONGS, id);
  state.songs = state.songs.filter((song) => song.id !== id);
  notify();
}

/* ---------- Instrument mutations ---------- */

export async function addInstrument(name: string): Promise<Instrument> {
  const clean = name.trim();
  if (!clean) throw new Error("An instrument needs a name.");

  const exists = state.instruments.some(
    (item) => item.name.toLowerCase() === clean.toLowerCase(),
  );
  if (exists) throw new Error(`"${clean}" is already in your list.`);

  const instrument: Instrument = {
    id: newId(),
    name: clean,
    archived: false,
    createdAt: now(),
  };

  await db.save(db.INSTRUMENTS, instrument);
  state.instruments = [...state.instruments, instrument];
  notify();
  return instrument;
}

export async function renameInstrument(
  id: string,
  name: string,
): Promise<Instrument> {
  const current = getInstrument(id);
  if (!current) throw new Error("That instrument no longer exists.");

  const clean = name.trim();
  if (!clean) throw new Error("An instrument needs a name.");

  const clash = state.instruments.some(
    (item) => item.id !== id && item.name.toLowerCase() === clean.toLowerCase(),
  );
  if (clash) throw new Error(`"${clean}" is already in your list.`);

  const next = { ...current, name: clean };
  await db.save(db.INSTRUMENTS, next);
  state.instruments = state.instruments.map((item) =>
    item.id === id ? next : item,
  );
  notify();
  return next;
}

export async function setInstrumentArchived(
  id: string,
  archived: boolean,
): Promise<Instrument> {
  const current = getInstrument(id);
  if (!current) throw new Error("That instrument no longer exists.");

  if (archived && getActiveInstruments().length <= 1) {
    throw new Error("Keep at least one active instrument.");
  }

  const next = { ...current, archived };
  await db.save(db.INSTRUMENTS, next);
  state.instruments = state.instruments.map((item) =>
    item.id === id ? next : item,
  );
  notify();
  return next;
}

/**
 * Deleting an instrument that still holds songs would orphan them, so it is
 * refused. Archiving is the safe path and is offered instead.
 */
export async function deleteInstrument(id: string): Promise<void> {
  const count = songCountFor(id);
  if (count > 0) {
    throw new Error(
      `"${instrumentName(id)}" still has ${count} song${count === 1 ? "" : "s"}. Archive it instead.`,
    );
  }
  if (getActiveInstruments().length <= 1) {
    throw new Error("Keep at least one active instrument.");
  }

  await db.remove(db.INSTRUMENTS, id);
  state.instruments = state.instruments.filter((item) => item.id !== id);
  notify();
}

/* ---------- Bulk ---------- */

export async function applyImport(
  data: { songs: Song[]; instruments: Instrument[] },
  mode: "replace" | "merge",
): Promise<void> {
  const incoming = {
    instruments: data.instruments,
    songs: data.songs.map((s) => normalizeSong(s as unknown as Record<string, unknown>)),
  };

  if (mode === "replace") {
    await db.replaceEverything(incoming);
    state.songs = incoming.songs;
    state.instruments = incoming.instruments;
    notify();
    return;
  }

  const songs = new Map(state.songs.map((song) => [song.id, song]));
  const instruments = new Map(
    state.instruments.map((item) => [item.id, item]),
  );

  // Existing records win on conflict: a merge must never overwrite local work.
  for (const song of incoming.songs)
    if (!songs.has(song.id)) songs.set(song.id, song);
  for (const item of incoming.instruments)
    if (!instruments.has(item.id)) instruments.set(item.id, item);

  const merged = {
    songs: [...songs.values()],
    instruments: [...instruments.values()],
  };

  await db.saveEverything(merged);
  state.songs = merged.songs;
  state.instruments = merged.instruments;
  notify();
}

/** Wipe everything and reseed a fresh library. */
export async function resetAll(): Promise<void> {
  await db.wipe();
  const seeded = { songs: seedSongs(), instruments: seedInstruments() };
  await db.saveEverything(seeded);
  state.songs = seeded.songs;
  state.instruments = seeded.instruments;
  notify();
}
