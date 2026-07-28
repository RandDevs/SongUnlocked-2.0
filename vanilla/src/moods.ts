/**
 * Mood presentation: which icon and which hue a tag gets.
 *
 * Kept separate from the store on purpose. The store owns what a tag *is* (a
 * cleaned string); this file owns what it *looks like*. A tag the user invents
 * is a first-class tag with no icon and no hue, and that is a deliberate
 * difference rather than a gap: the presets are a shared vocabulary the app can
 * illustrate, while "Songs for Dita's birthday" is private language it should
 * not pretend to understand.
 */

import { tagKey } from "./store.js";

const MOODS: Record<string, { icon: string; hue: string }> = {
  sad: { icon: "moodSad", hue: "sad" },
  love: { icon: "moodLove", hue: "love" },
  happy: { icon: "moodHappy", hue: "happy" },
  nostalgic: { icon: "moodNostalgic", hue: "nostalgic" },
  chill: { icon: "moodChill", hue: "chill" },
  upbeat: { icon: "moodUpbeat", hue: "upbeat" },
  campfire: { icon: "moodCampfire", hue: "campfire" },
};

export function moodStyle(
  label: string,
): { icon: string; hue: string } | null {
  return MOODS[tagKey(label)] || null;
}

/**
 * The value for the `data-mood` attribute. "default" keeps custom tags on the
 * neutral pair of tokens instead of leaving the CSS variable undefined.
 */
export function moodHue(label: string): string {
  return moodStyle(label)?.hue || "default";
}

export function moodIconName(label: string): string | null {
  return moodStyle(label)?.icon || null;
}
