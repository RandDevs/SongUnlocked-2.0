/**
 * Song detail and performance view.
 *
 * The sheet never wraps. A wrapped chord line would drift away from the
 * syllable it belongs to, which is worse than horizontal scrolling, so the
 * sheet scrolls sideways and the reader controls the type size instead.
 */

import { h, fill } from "../dom.js";
import { icon } from "../icons.js";
import * as store from "../store.js";
import { parseSheet, chordsUsed } from "../chordsheet.js";
import { createAutoscroll, MIN_SPEED, MAX_SPEED } from "../autoscroll.js";
import { openDialog, confirmDialog } from "../ui/dialog.js";
import { songForm } from "../ui/song-form.js";
import { moodHue, moodIconName } from "../moods.js";
import type { ViewContext, ViewInstance } from "../main.js";

const SIZE_KEY = "songunlocked:sheet-size";
const MIN_SIZE = 12;
const MAX_SIZE = 24;

export function loadSheetSize(): number {
  const stored = Number(localStorage.getItem(SIZE_KEY));
  if (!Number.isFinite(stored) || stored <= 0) return 15;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, stored));
}

function applySheetSize(size: number): void {
  document.documentElement.style.setProperty("--sheet-size", `${size}px`);
  localStorage.setItem(SIZE_KEY, String(size));
}

export function songView(ctx: ViewContext, songId: string): ViewInstance {
  const song = store.getSong(songId);

  if (!song) {
    return {
      node: h(
        "div",
        { class: "empty" },
        h("p", { class: "empty__title" }, "Song not found"),
        h("p", {}, "It may have been deleted."),
        h("a", { class: "btn", href: "#/library" }, "Back to library"),
      ),
    };
  }

  let sheetSize = loadSheetSize();
  applySheetSize(sheetSize);

  const headHost = h("header", { class: "songhead" });
  const sheetHost = h("pre", { class: "sheet", tabindex: "0" });

  const playButton = h("button", {
    class: "transport__play",
    type: "button",
    "aria-label": "Start autoscroll",
    dataset: { playing: "false" },
    onclick: () => autoscroll.toggle(),
  }) as HTMLButtonElement;

  const speedReadout = h("span", {});

  const autoscroll = createAutoscroll({
    onStateChange(playing) {
      playButton.dataset.playing = String(playing);
      playButton.setAttribute(
        "aria-label",
        playing ? "Pause autoscroll" : "Start autoscroll",
      );
      fill(playButton, icon(playing ? "pause" : "play", 22));
    },
  });

  fill(playButton, icon("play", 22));

  const speedSlider = h("input", {
    class: "slider",
    type: "range",
    min: String(MIN_SPEED),
    max: String(MAX_SPEED),
    step: "1",
    value: String(autoscroll.getSpeed()),
    "aria-label": "Scroll speed",
    oninput() {
      const applied = autoscroll.setSpeed(Number(speedSlider.value));
      paintSpeed(applied);
    },
  }) as HTMLInputElement;

  function paintSpeed(value: number): void {
    speedReadout.textContent = `${value} px/s`;
  }

  paintSpeed(autoscroll.getSpeed());

  function changeSize(next: number): void {
    sheetSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, next));
    applySheetSize(sheetSize);
  }

  const transport = h(
    "div",
    { class: "transport" },
    h(
      "div",
      { class: "transport__inner" },
      playButton,
      h(
        "div",
        { class: "transport__speed" },
        h(
          "div",
          { class: "transport__readout" },
          h("span", {}, "Autoscroll"),
          speedReadout,
        ),
        speedSlider,
      ),
      h(
        "div",
        { class: "transport__size" },
        h(
          "button",
          {
            class: "sizebtn",
            type: "button",
            "aria-label": "Smaller text",
            onclick: () => changeSize(sheetSize - 1),
          },
          "A\u2212",
        ),
        h(
          "button",
          {
            class: "sizebtn",
            type: "button",
            "aria-label": "Larger text",
            onclick: () => changeSize(sheetSize + 1),
          },
          "A+",
        ),
      ),
    ),
  );

  function openEditor(): void {
    const current = store.getSong(songId);
    if (!current) return;

    const form = songForm(current);
    openDialog({
      title: "Edit song",
      body: form.node,
      confirmLabel: "Save changes",
      onClose: () => form.destroy(),
      async onConfirm() {
        try {
          await store.updateSong(songId, form.values());
          ctx.toast("Changes saved");
          return true;
        } catch (error) {
          ctx.toast(
            error instanceof Error ? error.message : "Could not save changes",
            { error: true },
          );
          return false;
        }
      },
    });
  }

  function confirmDelete(): void {
    const current = store.getSong(songId);
    if (!current) return;

    confirmDialog({
      title: "Delete song",
      message: `"${current.title}" will be removed from your library. This cannot be undone.`,
      confirmLabel: "Delete song",
      async onConfirm() {
        await store.deleteSong(songId);
        ctx.toast(`"${current.title}" deleted`);
        ctx.navigate("#/library");
      },
    });
  }

  async function markMastered(): Promise<void> {
    try {
      const updated = await store.toggleStatus(songId);
      ctx.toast(`Marked as ${store.statusLabel(updated.status)}`);
    } catch (error) {
      ctx.toast(
        error instanceof Error ? error.message : "Could not update the status",
        { error: true },
      );
    }
  }

  function paintHead(): void {
    const current = store.getSong(songId);
    if (!current) return;

    const chords = chordsUsed(current.content);
    const mastered = current.status === "mastered";

    fill(
      headHost,
      h(
        "a",
        { class: "backlink", href: "#/library" },
        icon("chevronLeft", 18),
        "Library",
      ),
      h(
        "div",
        { class: "songhead__top" },
        h(
          "div",
          { class: "songhead__ident" },
          h("h1", { class: "songhead__title", text: current.title }),
          current.artist
            ? h("p", { class: "songhead__artist", text: current.artist })
            : null,
        ),
        h(
          "div",
          { class: "songhead__tools" },
          h(
            "button",
            {
              class: "btn btn--ghost btn--icon",
              type: "button",
              "aria-label": "Edit song",
              title: "Edit song",
              onclick: openEditor,
            },
            icon("pencil"),
          ),
          h(
            "button",
            {
              class: "btn btn--danger-ghost btn--icon",
              type: "button",
              "aria-label": "Delete song",
              title: "Delete song",
              onclick: confirmDelete,
            },
            icon("trash"),
          ),
        ),
      ),
      h(
        "div",
        { class: "songhead__facts" },
        h(
          "span",
          { class: `badge ${mastered ? "badge--mastered" : ""}` },
          store.statusLabel(current.status),
        ),
        h(
          "span",
          { class: "badge badge--plain" },
          store.instrumentName(current.instrumentId),
        ),
        h(
          "span",
          { class: "badge badge--plain" },
          store.cleanCapo(current.capo) === 0
            ? "No capo"
            : `Capo ${store.cleanCapo(current.capo)}`,
        ),
        ...store.cleanTags(current.tags).map((tag) => {
          const iconName = moodIconName(tag);
          return h(
            "span",
            { class: "badge badge--mood", dataset: { mood: moodHue(tag) } },
            iconName ? icon(iconName, 14) : null,
            h("span", { text: tag }),
          );
        }),
      ),
      chords.length
        ? h(
            "div",
            { class: "songhead__chords" },
            h("span", { class: "songhead__chordlabel" }, "Chords"),
            h("span", {
              class: "songhead__chordlist",
              text: chords.join("  "),
            }),
          )
        : null,
      mastered
        ? null
        : h(
            "div",
            { class: "songhead__actions" },
            h(
              "button",
              {
                class: "btn btn--primary",
                type: "button",
                onclick: markMastered,
              },
              icon("check"),
              "Mark as Mastered",
            ),
          ),
    );
  }

  function paintSheet(): void {
    const current = store.getSong(songId);
    if (!current) return;

    if (!current.content.trim()) {
      fill(
        sheetHost,
        h(
          "div",
          { class: "empty" },
          h("p", { class: "empty__title" }, "No chords yet"),
          h("p", {}, "Use Edit to paste a chord sheet for this song."),
        ),
      );
      return;
    }

    const lines = parseSheet(current.content);
    fill(
      sheetHost,
      lines.map((line, index) => {
        const text = index === lines.length - 1 ? line.text : `${line.text}\n`;
        if (line.kind === "chords")
          return h("span", { class: "sheet__chords", text });
        if (line.kind === "section")
          return h("span", { class: "sheet__section", text });
        return document.createTextNode(text);
      }),
    );
  }

  function paintAll(): void {
    if (!store.getSong(songId)) {
      ctx.navigate("#/library");
      return;
    }
    paintHead();
    paintSheet();
  }

  paintAll();
  const unsubscribe = store.subscribe(paintAll);

  const node = h(
    "div",
    {},
    headHost,
    sheetHost,
    h("div", { style: "height:120px" }),
    transport,
  );

  return {
    node,
    cleanup() {
      unsubscribe();
      autoscroll.destroy();
    },
  };
}
