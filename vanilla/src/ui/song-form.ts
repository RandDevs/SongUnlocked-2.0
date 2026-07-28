/**
 * The song editor, shared by "add song" and "edit song" so both paths can never
 * drift apart.
 */

import { h } from "../dom.js";
import * as store from "../store.js";
import { createSelect } from "./select.js";
import { createTagInput } from "./tag-input.js";

const PLACEHOLDER = [
  "[Verse 1]",
  "C               G",
  "Type the chord line, then the lyric under it",
].join("\n");

function capoLabel(value: number): string {
  return value === 0 ? "No capo" : `Capo ${value}`;
}

export interface SongFormInstance {
  node: HTMLElement;
  values: () => {
    title: string;
    artist: string;
    instrumentId: string;
    status: store.Status;
    capo: number;
    tags: string[];
    content: string;
  };
  focusTitle: () => void;
  destroy: () => void;
}

export function songForm(initial: Partial<store.Song> = {}): SongFormInstance {
  const instruments = store.getActiveInstruments();

  const title = h("input", {
    class: "input",
    id: "song-title",
    type: "text",
    required: true,
    value: initial.title || "",
    placeholder: "Song title",
    autocomplete: "off",
  }) as HTMLInputElement;

  const artist = h("input", {
    class: "input",
    id: "song-artist",
    type: "text",
    value: initial.artist || "",
    placeholder: "Artist",
    autocomplete: "off",
  }) as HTMLInputElement;

  const instrument = createSelect({
    id: "song-instrument",
    labelledBy: "song-instrument-label",
    options: instruments.map((item) => ({ value: item.id, label: item.name })),
    value: initial.instrumentId,
  });

  const status = createSelect({
    id: "song-status",
    labelledBy: "song-status-label",
    options: store.STATUSES.map((value) => ({
      value,
      label: store.statusLabel(value),
    })),
    value: initial.status || "mastered",
  });

  const capo = createSelect({
    id: "song-capo",
    labelledBy: "song-capo-label",
    options: Array.from({ length: store.MAX_CAPO + 1 }, (_, fret) => ({
      value: String(fret),
      label: capoLabel(fret),
    })),
    value: String(store.cleanCapo(initial.capo)),
  });

  const tags = createTagInput({
    id: "song-tags",
    value: initial.tags || [],
    suggestions: store.suggestedTags(),
  });

  const content = h("textarea", {
    class: "textarea",
    id: "song-content",
    spellcheck: false,
    placeholder: PLACEHOLDER,
    value: initial.content || "",
  }) as HTMLTextAreaElement;

  function field(id: string, text: string, control: Node): HTMLElement {
    return h(
      "div",
      { class: "field" },
      h("span", { class: "label", id: `${id}-label` }, text),
      control,
    );
  }

  const node = h(
    "div",
    { class: "stack" },
    h(
      "div",
      { class: "field" },
      h("label", { class: "label", for: "song-title" }, "Title"),
      title,
    ),
    h(
      "div",
      { class: "field" },
      h("label", { class: "label", for: "song-artist" }, "Artist"),
      artist,
    ),
    h(
      "div",
      { class: "grid2" },
      field("song-instrument", "Instrument", instrument.node),
      field("song-status", "Status", status.node),
    ),
    field("song-capo", "Capo", capo.node),
    field("song-tags", "Mood tags", tags.node),
    h(
      "div",
      { class: "field" },
      h("label", { class: "label", for: "song-content" }, "Chords and lyrics"),
      content,
      h(
        "p",
        { class: "hint" },
        "Put each chord line directly above its lyric line. Spacing is preserved exactly as typed.",
      ),
    ),
  );

  return {
    node,
    values() {
      return {
        title: title.value,
        artist: artist.value,
        instrumentId: instrument.value,
        status: status.value as store.Status,
        capo: Number(capo.value),
        tags: tags.values(),
        content: content.value,
      };
    },
    focusTitle() {
      title.focus();
    },
    destroy() {
      instrument.destroy();
      status.destroy();
      capo.destroy();
    },
  };
}
