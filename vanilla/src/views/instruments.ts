/**
 * Instruments.
 *
 * Archiving is the primary action, not deleting. An instrument you stop playing
 * still owns songs worth keeping, so archiving hides it from pickers and stats
 * while leaving its history intact. Deleting is only allowed once an instrument
 * holds no songs at all, which makes orphaned records impossible.
 */

import { h, fill } from "../dom.js";
import { icon } from "../icons.js";
import * as store from "../store.js";
import { confirmDialog, openDialog } from "../ui/dialog.js";
import type { ViewContext, ViewInstance } from "../main.js";

export function instrumentsView(ctx: ViewContext): ViewInstance {
  const rows = h("div", { class: "rows" });

  const nameInput = h("input", {
    class: "input",
    id: "instrument-name",
    type: "text",
    required: true,
    placeholder: "e.g. Classical Guitar",
    autocomplete: "off",
  }) as HTMLInputElement;

  const fail = (error: unknown) =>
    ctx.toast(
      error instanceof Error ? error.message : "Something went wrong.",
      {
        error: true,
      },
    );

  const form = h(
    "form",
    {
      class: "quickadd quickadd--inline",
      async onsubmit(event: Event) {
        event.preventDefault();
        try {
          const created = await store.addInstrument(nameInput.value);
          nameInput.value = "";
          ctx.toast(`${created.name} added`);
        } catch (error) {
          fail(error);
        } finally {
          nameInput.focus();
        }
      },
    },
    h(
      "div",
      { class: "field" },
      h("label", { class: "label", for: "instrument-name" }, "Add instrument"),
      nameInput,
    ),
    h(
      "button",
      { class: "btn btn--primary", type: "submit" },
      icon("plus"),
      "Add",
    ),
  );

  function openRename(instrument: store.Instrument): void {
    const field = h("input", {
      class: "input",
      type: "text",
      value: instrument.name,
      autocomplete: "off",
    }) as HTMLInputElement;

    openDialog({
      title: "Rename instrument",
      body: h(
        "div",
        { class: "field" },
        h("label", { class: "label" }, "Name"),
        field,
      ),
      confirmLabel: "Save",
      async onConfirm() {
        try {
          await store.renameInstrument(instrument.id, field.value);
          ctx.toast("Instrument renamed");
          return true;
        } catch (error) {
          fail(error);
          return false;
        }
      },
    });
  }

  function confirmDelete(instrument: store.Instrument): void {
    confirmDialog({
      title: "Delete instrument",
      message: `${instrument.name} will be removed permanently. This cannot be undone.`,
      confirmLabel: "Delete instrument",
      async onConfirm() {
        try {
          await store.deleteInstrument(instrument.id);
          ctx.toast(`${instrument.name} deleted`);
        } catch (error) {
          fail(error);
        }
      },
    });
  }

  function paint(): void {
    const all = store.getInstruments();

    if (all.length === 0) {
      fill(
        rows,
        h(
          "div",
          { class: "empty" },
          h("p", { class: "empty__title" }, "No instruments"),
          h("p", {}, "Add one above to start logging songs."),
        ),
      );
      return;
    }

    fill(
      rows,
      all.map((instrument) => {
        const songs = store.songCountFor(instrument.id);

        return h(
          "div",
          { class: `row ${instrument.archived ? "row--archived" : ""}` },
          h(
            "div",
            { class: "row__body" },
            h("p", { class: "row__name", text: instrument.name }),
            h("p", {
              class: "row__meta",
              text: [
                `${songs} song${songs === 1 ? "" : "s"}`,
                instrument.archived ? "Archived" : null,
              ]
                .filter(Boolean)
                .join(" \u00b7 "),
            }),
          ),
          h(
            "div",
            { class: "row__actions" },
            h(
              "button",
              {
                class: "btn btn--ghost btn--icon",
                type: "button",
                "aria-label": `Rename ${instrument.name}`,
                onclick: () => openRename(instrument),
              },
              icon("pencil"),
            ),
            h(
              "button",
              {
                class: "btn btn--ghost btn--icon",
                type: "button",
                "aria-label": instrument.archived
                  ? `Restore ${instrument.name}`
                  : `Archive ${instrument.name}`,
                async onclick() {
                  try {
                    await store.setInstrumentArchived(
                      instrument.id,
                      !instrument.archived,
                    );
                    ctx.toast(
                      instrument.archived
                        ? `${instrument.name} restored`
                        : `${instrument.name} archived`,
                    );
                  } catch (error) {
                    fail(error);
                  }
                },
              },
              icon(instrument.archived ? "restore" : "archive"),
            ),
            songs === 0
              ? h(
                  "button",
                  {
                    class: "btn btn--danger-ghost btn--icon",
                    type: "button",
                    "aria-label": `Delete ${instrument.name}`,
                    onclick: () => confirmDelete(instrument),
                  },
                  icon("trash"),
                )
              : null,
          ),
        );
      }),
    );
  }

  paint();
  const unsubscribe = store.subscribe(paint);

  const node = h(
    "div",
    {},
    h(
      "div",
      { class: "section__head" },
      h("h1", { class: "label" }, "Instruments"),
    ),
    h("section", { class: "section" }, h("div", { class: "card" }, form)),
    h(
      "section",
      { class: "section" },
      h(
        "div",
        { class: "section__head" },
        h("h2", { class: "label" }, "Your instruments"),
      ),
      rows,
      h(
        "p",
        { class: "hint hint--spaced" },
        "Archiving keeps an instrument's songs but hides it from pickers and stats. Deleting is only offered once an instrument has no songs left.",
      ),
    ),
  );

  return { node, cleanup: unsubscribe };
}
