import { test, expect } from "vitest";
import {
  serialize,
  parseBackup,
  BACKUP_VERSION,
  READABLE_VERSIONS,
} from "../src/backup.js";
import type { Instrument, Song } from "../src/store.js";

const instrument: Instrument = {
  id: "i1",
  name: "Guitar",
  archived: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const song: Song = {
  id: "s1",
  title: "Wonderwall",
  artist: "Oasis",
  instrumentId: "i1",
  status: "mastered",
  capo: 2,
  tags: ["Nostalgic"],
  content: "Em7  G",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

test("a serialized backup round-trips", () => {
  const text = serialize({ songs: [song], instruments: [instrument] });
  const parsed = parseBackup(text);

  expect(parsed.songs.length).toBe(1);
  expect(parsed.instruments.length).toBe(1);
  expect(parsed.songs[0]).toStrictEqual(song);
});

test("a version 1 file still imports, with capo and tags defaulted", () => {
  const text = JSON.stringify({
    version: 1,
    instruments: [instrument],
    songs: [
      {
        id: "s1",
        title: "Wonderwall",
        artist: "Oasis",
        instrumentId: "i1",
        status: "mastered",
        content: "Em7  G",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ],
  });

  const parsed = parseBackup(text);

  expect(parsed.songs[0].capo).toBe(0);
  expect(parsed.songs[0].tags).toStrictEqual([]);
  expect(parsed.songs[0].title).toBe("Wonderwall");
  expect(READABLE_VERSIONS.includes(1)).toBeTruthy();
});

test("capo and tags are cleaned on the way in", () => {
  const text = JSON.stringify({
    version: BACKUP_VERSION,
    instruments: [instrument],
    songs: [
      {
        id: "s1",
        title: "Creep",
        instrumentId: "i1",
        capo: 42,
        tags: ["  sad  ", "SAD", "", "Love"],
      },
    ],
  });

  const parsed = parseBackup(text);

  expect(parsed.songs[0].capo).toBe(7);
  expect(parsed.songs[0].tags).toStrictEqual(["sad", "Love"]);
});

test("rejects files that are not backups", () => {
  expect(() => parseBackup("")).toThrow(/empty/i);
  expect(() => parseBackup("not json at all")).toThrow(/valid JSON/i);
  expect(() => parseBackup("[]")).toThrow(/JSON object/i);
  expect(() => parseBackup("{}")).toThrow(/no version field/i);
});

test("rejects an unsupported version", () => {
  const text = JSON.stringify({ version: 99, songs: [], instruments: [] });
  expect(() => parseBackup(text)).toThrow(/not supported/i);
});

test("rejects a song pointing at a missing instrument", () => {
  const text = JSON.stringify({
    version: BACKUP_VERSION,
    instruments: [],
    songs: [song],
  });

  expect(() => parseBackup(text)).toThrow(
    /instrument that is not in this file/i,
  );
});

test("rejects duplicate song ids", () => {
  const text = JSON.stringify({
    version: BACKUP_VERSION,
    instruments: [instrument],
    songs: [song, song],
  });

  expect(() => parseBackup(text)).toThrow(/duplicate song ids/i);
});

test("repairs tolerable gaps instead of failing", () => {
  const text = JSON.stringify({
    version: BACKUP_VERSION,
    instruments: [{ id: "i1", name: "  Guitar  " }],
    songs: [{ id: "s1", title: " Creep ", instrumentId: "i1" }],
  });

  const parsed = parseBackup(text);

  expect(parsed.instruments[0].name).toBe("Guitar");
  expect(parsed.instruments[0].archived).toBe(false);
  expect(parsed.songs[0].title).toBe("Creep");
  expect(parsed.songs[0].artist).toBe("");
  expect(parsed.songs[0].content).toBe("");
  expect(parsed.songs[0].status).toBe("to_learn");
  expect(parsed.songs[0].updatedAt).toBeTruthy();
});

test("validation is all-or-nothing", () => {
  const text = JSON.stringify({
    version: BACKUP_VERSION,
    instruments: [instrument],
    songs: [song, { id: "s2", title: "", instrumentId: "i1" }],
  });

  expect(() => parseBackup(text)).toThrow(/songs\[1\] is missing a title/);
});
