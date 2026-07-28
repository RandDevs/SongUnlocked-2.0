/**
 * First-run content.
 *
 * Song titles and artists are real so the library looks like a real library.
 * The sheet text is written for this demo — it is not the actual lyrics of any
 * song, which keeps a public portfolio repository clear of copyrighted text.
 * Chord progressions are included because they demonstrate the alignment the
 * chord sheet is built around.
 */

import type { Song, Instrument, Status } from "./store.js";

const GUITAR = "seed-instrument-guitar";
const UKULELE = "seed-instrument-ukulele";

function when(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(9, 30, 0, 0);
  return date.toISOString();
}

export function seedInstruments(): Instrument[] {
  return [
    { id: GUITAR, name: "Guitar", archived: false, createdAt: when(120) },
    { id: UKULELE, name: "Ukulele", archived: false, createdAt: when(96) },
  ];
}

export function seedSongs(): Song[] {
  const drafts: Array<{
    title: string;
    artist: string;
    instrumentId: string;
    status: Status;
    capo: number;
    tags: string[];
    content: string;
    days: number;
  }> = [
    {
      title: "Wonderwall",
      artist: "Oasis",
      instrumentId: GUITAR,
      status: "mastered",
      capo: 2,
      tags: ["Nostalgic", "Campfire"],
      days: 3,
      content: [
        "[Intro]",
        "Em7  G  Dsus4  A7sus4",
        "",
        "[Verse 1]",
        "Em7             G",
        "Demo line one, capo on the second fret",
        "Dsus4              A7sus4",
        "Keep the strumming loose and let it ring",
        "Em7             G",
        "Demo line three, watch the chord change land",
        "Dsus4              A7sus4",
        "Right on the downbeat, every single time",
        "",
        "[Chorus]",
        "Cadd9        Em7      G",
        "Lift the dynamic here, open up the voicing",
        "Em7          Cadd9    Em7      G",
        "Then settle back down and hold the line",
      ].join("\n"),
    },
    {
      title: "Let It Be",
      artist: "The Beatles",
      instrumentId: GUITAR,
      status: "mastered",
      capo: 0,
      tags: ["Chill", "Campfire"],
      days: 11,
      content: [
        "[Verse 1]",
        "C              G",
        "Placeholder lyric for the opening phrase",
        "Am              F",
        "Chords sit above the syllable they land on",
        "C           G       F      C",
        "Close the verse and breathe before the turn",
        "",
        "[Chorus]",
        "Am      G       F      C",
        "Four bars, one chord each, nothing rushed",
        "C           G       F      C",
        "Let the last chord ring out completely",
      ].join("\n"),
    },
    {
      title: "Riptide",
      artist: "Vance Joy",
      instrumentId: UKULELE,
      status: "mastered",
      capo: 0,
      tags: ["Happy", "Campfire"],
      days: 1,
      content: [
        "[Intro]",
        "Am  G  C",
        "",
        "[Verse 1]",
        "Am        G          C",
        "Demo line for the ukulele arrangement",
        "Am        G            C",
        "Three chords carry the entire progression",
        "Am         G           C",
        "Keep the right hand steady and quiet",
        "",
        "[Chorus]",
        "Am    G       C",
        "Open up the strum on the chorus",
        "Am      G          C",
        "Then pull it back for the next verse",
      ].join("\n"),
    },
    {
      title: "Creep",
      artist: "Radiohead",
      instrumentId: GUITAR,
      status: "to_learn",
      capo: 0,
      tags: ["Sad"],
      days: 20,
      content: [
        "[Verse 1]",
        "G              B",
        "Placeholder line, mind the major third",
        "C              Cm",
        "The fourth chord is the whole trick here",
        "G              B",
        "Let the clean tone sit under the vocal",
        "C              Cm",
        "Then hit the change harder the second time",
        "",
        "[Chorus]",
        "G       B      C     Cm",
        "Same four chords, twice the intensity",
      ].join("\n"),
    },
    {
      title: "Somewhere Over the Rainbow",
      artist: "Israel Kamakawiwo\u02bbole",
      instrumentId: UKULELE,
      status: "to_learn",
      capo: 0,
      tags: ["Love", "Chill"],
      days: 34,
      content: [
        "[Verse 1]",
        "C                Em",
        "Demo phrase for the medley arrangement",
        "F                C",
        "Thumb keeps time, fingers do the rest",
        "F           C        G       Am    F",
        "The long line needs one breath, not two",
        "",
        "[Bridge]",
        "C     G      Am      F",
        "Slow the tempo down through the bridge",
      ].join("\n"),
    },
    {
      title: "Hey There Delilah",
      artist: "Plain White T's",
      instrumentId: GUITAR,
      status: "to_learn",
      capo: 2,
      tags: ["Love", "Sad"],
      days: 48,
      content: [
        "[Verse 1]",
        "D              F#m",
        "Placeholder text for the fingerpicked verse",
        "D              F#m",
        "Alternate the bass note under each chord",
        "Bm      G       A",
        "Pre-chorus lifts, then resolve it home",
        "",
        "[Chorus]",
        "D    F#m    Bm    G    A    D",
        "Hold the last D and let the room take it",
      ].join("\n"),
    },
  ];

  return drafts.map((draft, index) => ({
    id: `seed-song-${index + 1}`,
    title: draft.title,
    artist: draft.artist,
    instrumentId: draft.instrumentId,
    status: draft.status,
    capo: draft.capo,
    tags: draft.tags,
    content: draft.content,
    createdAt: when(draft.days + 30),
    updatedAt: when(draft.days),
  }));
}
