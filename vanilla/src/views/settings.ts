import { h, fill } from "../dom.js";
import { icon } from "../icons.js";
import * as store from "../store.js";
import {
  serialize,
  parseBackup,
  downloadFile,
  backupFilename,
} from "../backup.js";
import { confirmDialog } from "../ui/dialog.js";
import { createSelect } from "../ui/select.js";
import type { ViewContext, ViewInstance } from "../main.js";

export function settingsView(ctx: ViewContext): ViewInstance {
  const summary = h("p", { class: "hint" });

  const fileInput = h("input", {
    class: "visually-hidden",
    id: "import-file",
    type: "file",
    accept: "application/json,.json",
  }) as HTMLInputElement;

  const fileName = h("span", {
    class: "filepick__name",
    text: "No file chosen",
  });

  const modeSelect = createSelect({
    id: "import-mode",
    labelledBy: "import-mode-label",
    options: [
      { value: "merge", label: "Merge: add what is new" },
      { value: "replace", label: "Replace: wipe, then load" },
    ],
  });

  function paintSummary(): void {
    const songs = store.getSongs();
    const mastered = songs.filter((song) => song.status === "mastered").length;
    const instruments = store.getInstruments().length;

    summary.textContent = `${songs.length} song${songs.length === 1 ? "" : "s"} \u00b7 ${mastered} mastered \u00b7 ${instruments} instrument${instruments === 1 ? "" : "s"}, stored on this device only.`;
  }

  function exportNow(): void {
    try {
      downloadFile(
        backupFilename(),
        serialize({
          songs: store.getSongs(),
          instruments: store.getInstruments(),
        }),
      );
      ctx.toast("Backup downloaded.");
    } catch (error) {
      ctx.toast(error instanceof Error ? error.message : "Export failed.", {
        error: true,
      });
    }
  }

  async function importNow(): Promise<void> {
    const file = fileInput.files?.[0];
    if (!file) {
      ctx.toast("Choose a backup file first.", { error: true });
      return;
    }

    try {
      const text = await file.text();
      const data = parseBackup(text);
      const mode = modeSelect.value as "merge" | "replace";

      const apply = async () => {
        await store.applyImport(data, mode);
        fileInput.value = "";
        ctx.toast(
          `Imported ${data.songs.length} song${data.songs.length === 1 ? "" : "s"}.`,
        );
      };

      if (mode === "replace") {
        confirmDialog({
          title: "Replace everything?",
          message: `Your current ${store.getSongs().length} song${store.getSongs().length === 1 ? "" : "s"} will be deleted and replaced by the ${data.songs.length} in this file.`,
          confirmLabel: "Replace library",
          onConfirm: apply,
        });
        return;
      }

      await apply();
    } catch (error) {
      ctx.toast(
        error instanceof Error ? error.message : "That file could not be read.",
        { error: true },
      );
    }
  }

  function resetNow(): void {
    confirmDialog({
      title: "Reset library",
      message:
        "Every song and instrument on this device is deleted and the sample library is restored. Export a backup first if you want to keep anything.",
      confirmLabel: "Delete everything",
      async onConfirm() {
        await store.resetAll();
        ctx.toast("Library reset to the sample content.");
      },
    });
  }

  paintSummary();
  const unsubscribe = store.subscribe(paintSummary);

  const node = h(
    "div",
    {},
    h(
      "div",
      { class: "section__head" },
      h("h1", { class: "label" }, "Settings"),
    ),

    h(
      "section",
      { class: "section" },
      h(
        "div",
        { class: "card" },
        h("h2", { class: "card__title" }, "Your data"),
        summary,
        h(
          "div",
          { class: "card__actions" },
          h(
            "button",
            { class: "btn btn--primary", type: "button", onclick: exportNow },
            icon("download"),
            "Export backup",
          ),
        ),
      ),
    ),

    h(
      "section",
      { class: "section" },
      h(
        "div",
        { class: "card" },
        h("h2", { class: "card__title" }, "Import a backup"),
        h(
          "div",
          { class: "field" },
          h("span", { class: "label" }, "Backup file"),
          h(
            "div",
            { class: "filepick" },
            fileInput,
            h("label", { class: "btn", for: "import-file" }, "Choose file"),
            fileName,
          ),
        ),
        h(
          "div",
          { class: "field" },
          h(
            "span",
            { class: "label", id: "import-mode-label" },
            "How to apply it",
          ),
          modeSelect.node,
        ),
        h(
          "p",
          { class: "hint" },
          "The whole file is checked before anything is written, so a broken backup cannot half-import.",
        ),
        h(
          "div",
          { class: "card__actions" },
          h(
            "button",
            { class: "btn", type: "button", onclick: importNow },
            icon("upload"),
            "Import",
          ),
        ),
      ),
    ),

    h(
      "section",
      { class: "section" },
      h(
        "div",
        { class: "card danger-zone" },
        h("h2", { class: "card__title" }, "Reset"),
        h(
          "p",
          { class: "hint" },
          "Clears this device and restores the sample library.",
        ),
        h(
          "div",
          { class: "card__actions" },
          h(
            "button",
            { class: "btn btn--danger", type: "button", onclick: resetNow },
            icon("trash"),
            "Reset library",
          ),
        ),
      ),
    ),

    h(
      "section",
      { class: "section" },
      h(
        "div",
        { class: "card" },
        h("h2", { class: "card__title" }, "About"),
        h(
          "p",
          { class: "hint" },
          "SongUnlocked is an offline songbook for tracking what you can actually play. No account, no server, no third-party code.",
        ),
      ),
    ),
  );

  fileInput.addEventListener("change", () => {
    fileName.textContent = fileInput.files?.length
      ? fileInput.files[0].name
      : "No file chosen";
  });

  void fill;

  return { node, cleanup: unsubscribe };
}
