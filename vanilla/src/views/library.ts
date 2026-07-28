/**
 * Library: search, filter, open.
 *
 * The search field is created once and never replaced. Filtering only rewrites
 * the results list, so the caret, the selection, and focus survive every
 * keystroke. Re-rendering the whole screen on input is what breaks search boxes
 * in hand-rolled apps; this avoids the problem structurally rather than by
 * saving and restoring focus after the damage is done.
 *
 * Filter design: single-choice filters are dropdowns, the multi-choice one is
 * pills. Instruments and capo positions both grow without a ceiling, and a row
 * of chips that grows sideways eventually hides its own options behind a scroll
 * nobody notices. A dropdown costs one tap and never changes size. Mood stays
 * as pills because it is the only filter you set two of at once, and a
 * multi-select dropdown turns a one-tap decision into open-tap-tap-close.
 *
 * A dropdown does hide its state, so an active one is drawn in the accent while
 * a resting one stays neutral. "All instruments" is allowed to exist here, as a
 * quiet default value inside a control, which is not the same thing as a loud
 * chip competing for attention with real filters.
 */

import { h, fill } from "../dom.js";
import { icon } from "../icons.js";
import * as store from "../store.js";
import { openDialog } from "../ui/dialog.js";
import { songForm } from "../ui/song-form.js";
import { createSelect, type SelectInstance } from "../ui/select.js";
import { moodChip } from "../ui/tag-input.js";
import type { ViewContext, ViewInstance } from "../main.js";

const FILTER_KEY = "songunlocked:filters";

interface StoredFilters {
  instrumentId?: string;
  status?: store.Status | "all";
  capo?: number | "all";
  tags?: string[];
}

interface FilterState {
  query: string;
  instrumentId: string;
  status: store.Status | "all";
  capo: number | "all";
  tags: string[];
}

function loadFilters(): StoredFilters | null {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFilters;
    return {
      instrumentId:
        typeof parsed.instrumentId === "string" ? parsed.instrumentId : "all",
      status:
        parsed.status === "mastered" || parsed.status === "to_learn"
          ? parsed.status
          : "all",
      capo: typeof parsed.capo === "number" ? parsed.capo : "all",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function saveFilters(filters: FilterState): void {
  try {
    localStorage.setItem(
      FILTER_KEY,
      JSON.stringify({
        instrumentId: filters.instrumentId,
        status: filters.status,
        capo: filters.capo,
        tags: filters.tags,
      }),
    );
  } catch {
    // A blocked localStorage costs us persistence, not the feature.
  }
}

function capoLabel(value: number): string {
  return value === 0 ? "No capo" : `Capo ${value}`;
}

export function libraryView(ctx: ViewContext): ViewInstance {
  const filters: FilterState = {
    query: "",
    instrumentId: "all",
    status: "all",
    capo: "all",
    tags: [],
    ...(loadFilters() || {}),
  };

  const searchInput = h("input", {
    class: "input",
    type: "search",
    id: "library-search",
    placeholder: "Search title or artist",
    autocomplete: "off",
    oninput() {
      filters.query = searchInput.value;
      paintResults();
    },
  }) as HTMLInputElement;

  const moodRow = h("div", { class: "moodrow", id: "filter-moods" });
  const results = h("ul", { class: "songlist" });
  const count = h("p", { class: "count" });

  const instrumentSelect = createSelect({
    id: "filter-instrument",
    ariaLabel: "Filter by instrument",
    options: [{ value: "all", label: "All instruments" }],
    onChange(value) {
      filters.instrumentId = value;
      commit();
    },
  });

  const statusSelect = createSelect({
    id: "filter-status",
    ariaLabel: "Filter by status",
    options: [
      { value: "all", label: "Any status" },
      ...store.STATUSES.map((value) => ({
        value,
        label: store.statusLabel(value),
      })),
    ],
    onChange(value) {
      filters.status = value as store.Status | "all";
      commit();
    },
  });

  const capoSelect = createSelect({
    id: "filter-capo",
    ariaLabel: "Filter by capo position",
    options: [{ value: "all", label: "Any capo" }],
    onChange(value) {
      filters.capo = value === "all" ? "all" : Number(value);
      commit();
    },
  });

  const clearButton = h(
    "button",
    {
      class: "btn btn--ghost btn--small",
      type: "button",
      id: "clear-filters",
      hidden: true,
      onclick() {
        filters.instrumentId = "all";
        filters.status = "all";
        filters.capo = "all";
        filters.tags = [];
        commit();
      },
    },
    "Clear",
  );

  function commit(): void {
    saveFilters(filters);
    paintFilters();
    paintResults();
  }

  function anyActive(): boolean {
    return (
      filters.instrumentId !== "all" ||
      filters.status !== "all" ||
      filters.capo !== "all" ||
      filters.tags.length > 0
    );
  }

  function pickField(
    name: string,
    select: SelectInstance,
    active: boolean,
  ): HTMLElement {
    select.trigger.dataset.active = String(active);
    return h(
      "div",
      { class: "pickfield" },
      h("label", {
        class: "pickfield__label",
        for: select.trigger.id,
        text: name,
      }),
      select.node,
    );
  }

  const filterGrid = h("div", { class: "filtergrid" });

  function paintFilters(): void {
    instrumentSelect.setOptions([
      { value: "all", label: "All instruments" },
      ...store
        .getActiveInstruments()
        .map((item) => ({ value: item.id, label: item.name })),
    ]);
    instrumentSelect.setValue(filters.instrumentId);

    statusSelect.setValue(String(filters.status));

    capoSelect.setOptions([
      { value: "all", label: "Any capo" },
      ...store
        .capoValues()
        .map((value) => ({ value: String(value), label: capoLabel(value) })),
    ]);
    capoSelect.setValue(String(filters.capo));

    fill(
      filterGrid,
      pickField("Instrument", instrumentSelect, filters.instrumentId !== "all"),
      pickField("Status", statusSelect, filters.status !== "all"),
      pickField("Capo", capoSelect, filters.capo !== "all"),
    );

    const moods = store.tagsInUse();
    fill(
      moodRow,
      moods.map(({ label }) =>
        moodChip({
          label,
          pressed: filters.tags.some(
            (tag) => store.tagKey(tag) === store.tagKey(label),
          ),
          onPress() {
            const key = store.tagKey(label);
            filters.tags = filters.tags.some((tag) => store.tagKey(tag) === key)
              ? filters.tags.filter((tag) => store.tagKey(tag) !== key)
              : [...filters.tags, label];
            commit();
          },
        }),
      ),
    );
    moodRow.hidden = moods.length === 0;

    clearButton.hidden = !anyActive();
  }

  function paintResults(): void {
    const songs = store.findSongs(filters);
    const total = store.getSongs().length;

    count.textContent =
      songs.length === total
        ? `${total} song${total === 1 ? "" : "s"}`
        : `${songs.length} of ${total} songs`;

    if (songs.length === 0) {
      fill(
        results,
        h(
          "li",
          {},
          h(
            "div",
            { class: "empty" },
            h(
              "p",
              { class: "empty__title" },
              total === 0 ? "Your library is empty" : "No matches",
            ),
            h(
              "p",
              {},
              total === 0
                ? "Add your first song and it will show up here."
                : "Try a different search term or clear the filters.",
            ),
          ),
        ),
      );
      return;
    }

    fill(
      results,
      songs.map((song) => {
        const capo = store.cleanCapo(song.capo);
        return h(
          "li",
          {},
          h(
            "a",
            { class: "songrow", href: `#/song/${song.id}` },
            h("span", {
              class: `songrow__dot ${song.status === "mastered" ? "songrow__dot--mastered" : ""}`,
              title: store.statusLabel(song.status),
            }),
            h(
              "span",
              { class: "songrow__body" },
              h("span", { class: "songrow__title", text: song.title }),
              h("span", {
                class: "songrow__meta",
                text: [song.artist, store.instrumentName(song.instrumentId)]
                  .filter(Boolean)
                  .join(" \u00b7 "),
              }),
            ),
            capo > 0
              ? h("span", { class: "capotag", text: `Capo ${capo}` })
              : null,
            icon("chevronLeft", 18),
          ),
        );
      }),
    );

    for (const svg of results.querySelectorAll(".songrow > svg")) {
      svg.setAttribute("style", "transform:rotate(180deg);opacity:.35");
    }
  }

  function openNewSongDialog(): void {
    if (store.getActiveInstruments().length === 0) {
      ctx.toast("Add an instrument before adding songs.", { error: true });
      return;
    }

    const form = songForm();
    openDialog({
      title: "New song",
      body: form.node,
      confirmLabel: "Save song",
      onClose: () => form.destroy(),
      async onConfirm() {
        try {
          const song = await store.addSong(form.values());
          ctx.toast(`"${song.title}" added.`);
          return true;
        } catch (error) {
          ctx.toast(
            error instanceof Error ? error.message : "Could not save the song.",
            { error: true },
          );
          return false;
        }
      },
    });
  }

  paintFilters();
  paintResults();

  const unsubscribe = store.subscribe(() => {
    paintFilters();
    paintResults();
  });

  const node = h(
    "div",
    {},
    h(
      "div",
      { class: "section__head" },
      h("h1", { class: "label" }, "Library"),
      h(
        "button",
        {
          class: "btn btn--primary",
          type: "button",
          onclick: openNewSongDialog,
        },
        icon("plus"),
        "New song",
      ),
    ),
    h(
      "div",
      { class: "toolbar" },
      h(
        "div",
        { class: "search" },
        h("span", { class: "search__icon" }, icon("search", 18)),
        h(
          "label",
          { class: "visually-hidden", for: "library-search" },
          "Search",
        ),
        searchInput,
      ),
      filterGrid,
      moodRow,
    ),
    h("div", { class: "resulthead" }, count, clearButton),
    results,
  );

  return {
    node,
    cleanup() {
      unsubscribe();
      instrumentSelect.destroy();
      statusSelect.destroy();
      capoSelect.destroy();
    },
  };
}
