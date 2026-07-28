/**
 * Home: capture first, review second.
 *
 * Adding a song is the single most frequent action, so it sits above
 * everything else and defaults to Mastered — you usually log a song at the
 * moment you realise you can already play it.
 */

import { h, fill } from "../dom.js";
import { icon } from "../icons.js";
import * as store from "../store.js";
import { createSelect } from "../ui/select.js";
import type { ViewContext, ViewInstance } from "../main.js";

export function homeView(ctx: ViewContext): ViewInstance {
  const statsHost = h("div", { class: "stats" });
  const recentHost = h("ul", { class: "songlist" });

  const titleInput = h("input", {
    class: "input",
    id: "quick-title",
    type: "text",
    required: true,
    placeholder: "Song title",
    autocomplete: "off",
    enterkeyhint: "done",
  }) as HTMLInputElement;

  const instrumentSelect = createSelect({
    id: "quick-instrument",
    ariaLabel: "Instrument",
    options: store
      .getActiveInstruments()
      .map((item) => ({ value: item.id, label: item.name })),
  });

  function paintInstrumentOptions(): void {
    instrumentSelect.setOptions(
      store
        .getActiveInstruments()
        .map((item) => ({ value: item.id, label: item.name })),
    );
  }

  const form = h(
    "form",
    {
      class: "quickadd",
      async onsubmit(event: Event) {
        event.preventDefault();

        const title = titleInput.value.trim();
        if (!title) {
          ctx.toast("Give the song a title first.", { error: true });
          titleInput.focus();
          return;
        }

        try {
          await store.addSong({
            title,
            instrumentId: instrumentSelect.value,
            status: "mastered",
          });
          titleInput.value = "";
          ctx.toast(`"${title}" saved as Mastered.`);
        } catch (error) {
          ctx.toast(messageOf(error), { error: true });
        } finally {
          titleInput.focus();
        }
      },
    },
    h(
      "div",
      { class: "field" },
      h("label", { class: "label", for: "quick-title" }, "Add a song"),
      titleInput,
    ),
    h(
      "div",
      { class: "field" },
      h("label", { class: "label", for: "quick-instrument" }, "Instrument"),
      instrumentSelect.node,
    ),
    h(
      "button",
      { class: "btn btn--primary", type: "submit" },
      icon("plus"),
      "Add",
    ),
  );

  function paintStats(): void {
    const stats = store.masteryStats();

    if (stats.length === 0) {
      fill(
        statsHost,
        h(
          "div",
          { class: "empty" },
          h("p", { class: "empty__title" }, "No instruments yet"),
          h(
            "p",
            {},
            "Add an instrument and your mastery breakdown will appear here.",
          ),
          h("a", { class: "btn", href: "#/instruments" }, "Manage instruments"),
        ),
      );
      return;
    }

    fill(
      statsHost,
      stats.map((entry) => {
        const percent = entry.total
          ? Math.round((entry.mastered / entry.total) * 100)
          : 0;

        return h(
          "article",
          { class: "stat" },
          h("h3", { class: "stat__name", text: entry.instrument.name }),
          h(
            "div",
            { class: "stat__figure" },
            h("span", { class: "stat__value", text: String(entry.mastered) }),
            h("span", {
              class: "stat__of",
              text: `of ${entry.total} mastered`,
            }),
          ),
          h(
            "div",
            {
              class: "meter",
              role: "img",
              "aria-label": `${percent}% mastered`,
            },
            h("div", { class: "meter__fill", style: `width:${percent}%` }),
          ),
          h(
            "div",
            { class: "stat__legend" },
            h("span", { text: `${percent}%` }),
            h("span", { text: `${entry.toLearn} to learn` }),
          ),
        );
      }),
    );
  }

  function paintRecent(): void {
    const recent = store.findSongs().slice(0, 4);

    if (recent.length === 0) {
      fill(recentHost, h("li", { class: "hint" }, "Nothing logged yet."));
      return;
    }

    fill(
      recentHost,
      recent.map((song) =>
        h(
          "li",
          {},
          h(
            "a",
            { class: "songrow", href: `#/song/${song.id}` },
            h("span", {
              class: `songrow__dot ${song.status === "mastered" ? "songrow__dot--mastered" : ""}`,
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
          ),
        ),
      ),
    );
  }

  function paintAll(): void {
    paintInstrumentOptions();
    paintStats();
    paintRecent();
  }

  paintAll();
  const unsubscribe = store.subscribe(paintAll);

  const node = h(
    "div",
    {},
    h("section", { class: "section" }, h("div", { class: "card" }, form)),
    h(
      "section",
      { class: "section" },
      h(
        "div",
        { class: "section__head" },
        h("h2", { class: "label" }, "Mastery"),
      ),
      statsHost,
    ),
    h(
      "section",
      { class: "section" },
      h(
        "div",
        { class: "section__head" },
        h("h2", { class: "label" }, "Recent activity"),
        h("a", { class: "count", href: "#/library" }, "See all"),
      ),
      recentHost,
    ),
  );

  return { node, cleanup: unsubscribe };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
