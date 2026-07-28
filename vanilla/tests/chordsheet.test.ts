import { test, expect } from "vitest";
import {
  isChordLine,
  isSectionLine,
  parseSheet,
  chordsUsed,
} from "../src/chordsheet.js";

test("recognises chord lines", () => {
  expect(isChordLine("C  G  Am  F")).toBe(true);
  expect(isChordLine("Em7        Cadd9")).toBe(true);
  expect(isChordLine("D/F#  Bb  F#m7")).toBe(true);
  expect(isChordLine("A7sus4  Dsus4")).toBe(true);
});

test("does not mistake lyrics for chords", () => {
  expect(isChordLine("And I would walk five hundred miles")).toBe(false);
  expect(isChordLine("Baby, come back")).toBe(false);
  expect(isChordLine("")).toBe(false);
  expect(isChordLine("A dream is a wish")).toBe(false);
});

test("recognises section headers", () => {
  expect(isSectionLine("[Verse 1]")).toBe(true);
  expect(isSectionLine("[Chorus]")).toBe(true);
  expect(isSectionLine("C  G")).toBe(false);
});

test("parseSheet keeps every line and its exact text", () => {
  const input = ["[Verse 1]", "C       G", "Some lyric line", ""].join("\n");
  const lines = parseSheet(input);

  expect(lines.length).toBe(4);
  expect(lines.map((line) => line.kind)).toStrictEqual([
    "section",
    "chords",
    "lyrics",
    "blank",
  ]);
  expect(lines[1].text).toBe("C       G");
});

test("chordsUsed lists each chord once, in order of appearance", () => {
  const input = [
    "[Verse]",
    "C     G     Am    F",
    "A lyric line here",
    "C     G",
  ].join("\n");

  expect(chordsUsed(input)).toStrictEqual(["C", "G", "Am", "F"]);
});

test("chordsUsed ignores lyric words", () => {
  expect(chordsUsed("Just a line of words")).toStrictEqual([]);
});
