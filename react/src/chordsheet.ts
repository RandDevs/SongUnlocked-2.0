/**
 * Chord sheet parsing.
 *
 * A sheet is plain text where chord lines sit directly above the lyric line
 * they belong to:
 *
 *     [Verse 1]
 *     C               G
 *     Steady on the downbeat, hold it there
 *
 * Classification is done per line so chord rows can be tinted and section
 * markers can be set apart, while the exact spacing is preserved untouched.
 */

/** Matches one chord token, e.g. C, F#m7, Bb, Asus4, D/F#, Cmaj7. */
const CHORD =
  /^[A-G](?:#|b)?(?:maj|min|m|M|sus|dim|aug|add|\+|-)?\d*(?:sus\d)?(?:\/[A-G](?:#|b)?)?$/;

export function isSectionLine(line: string): boolean {
  const text = line.trim();
  return text.startsWith("[") && text.endsWith("]") && text.length > 2;
}

/**
 * A line is a chord line when it holds at least one token and every token is a
 * recognisable chord. Bar separators are tolerated.
 */
export function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  let chords = 0;
  for (const token of tokens) {
    if (token === "|" || token === "||" || token === "%") continue;
    if (!CHORD.test(token)) return false;
    chords += 1;
  }

  return chords > 0;
}

export interface SheetLine {
  kind: "chords" | "section" | "lyrics" | "blank";
  text: string;
}

export function parseSheet(content: string): SheetLine[] {
  if (!content) return [];

  return content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((text): SheetLine => {
      if (text.trim() === "") return { kind: "blank", text };
      if (isSectionLine(text)) return { kind: "section", text };
      if (isChordLine(text)) return { kind: "chords", text };
      return { kind: "lyrics", text };
    });
}

/**
 * Every distinct chord used in a sheet, in order of first appearance.
 * Shown on the song page as a quick "what am I about to play" summary.
 */
export function chordsUsed(content: string): string[] {
  const found: string[] = [];

  for (const line of parseSheet(content)) {
    if (line.kind !== "chords") continue;
    for (const token of line.text.trim().split(/\s+/)) {
      if (!CHORD.test(token)) continue;
      if (!found.includes(token)) found.push(token);
    }
  }

  return found;
}
