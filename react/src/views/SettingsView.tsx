import React, { useState, useRef } from "react";
import * as store from "../store.js";
import { useSongs, useInstruments } from "../hooks/useStore.js";
import { useToast } from "../components/ToastContext.js";
import { Icon } from "../components/Icon.js";
import { Select } from "../components/Select.js";
import { ConfirmDialog } from "../components/Dialog.js";
import {
  serialize,
  parseBackup,
  downloadFile,
  backupFilename,
} from "../backup.js";

export function SettingsView() {
  const songs = useSongs();
  const instruments = useInstruments();
  const { toast } = useToast();

  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [chosenFileName, setChosenFileName] = useState("No file chosen");
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingBackupDataRef = useRef<{
    songs: store.Song[];
    instruments: store.Instrument[];
  } | null>(null);

  const masteredCount = songs.filter((s) => s.status === "mastered").length;
  const summaryText = `${songs.length} song${songs.length === 1 ? "" : "s"} \u00b7 ${masteredCount} mastered \u00b7 ${instruments.length} instrument${instruments.length === 1 ? "" : "s"}, stored on this device only.`;

  const handleExport = () => {
    try {
      downloadFile(
        backupFilename(),
        serialize({
          songs: store.getSongs(),
          instruments: store.getInstruments(),
        }),
      );
      toast("Backup downloaded.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Export failed.", {
        error: true,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setChosenFileName(file ? file.name : "No file chosen");
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast("Choose a backup file first.", { error: true });
      return;
    }

    try {
      const text = await file.text();
      const data = parseBackup(text);

      if (importMode === "replace") {
        pendingBackupDataRef.current = data;
        setIsReplaceDialogOpen(true);
        return;
      }

      await store.applyImport(data, "merge");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setChosenFileName("No file chosen");
      toast(
        `Imported ${data.songs.length} song${data.songs.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "That file could not be read.",
        { error: true },
      );
    }
  };

  const handleConfirmReplace = async () => {
    const data = pendingBackupDataRef.current;
    if (!data) return;
    await store.applyImport(data, "replace");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setChosenFileName("No file chosen");
    setIsReplaceDialogOpen(false);
    toast(
      `Imported ${data.songs.length} song${data.songs.length === 1 ? "" : "s"}.`,
    );
  };

  const handleConfirmReset = async () => {
    await store.resetAll();
    setIsResetDialogOpen(false);
    toast("Library reset to the sample content.");
  };

  return (
    <div>
      <div className="section__head">
        <h1 className="label">Settings</h1>
      </div>

      <section className="section">
        <div className="card">
          <h2 className="card__title">Your data</h2>
          <p className="hint">{summaryText}</p>
          <div className="card__actions">
            <button
              className="btn btn--primary"
              type="button"
              onClick={handleExport}
            >
              <Icon name="download" />
              Export backup
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2 className="card__title">Import a backup</h2>

          <div className="field">
            <span className="label">Backup file</span>
            <div className="filepick">
              <input
                ref={fileInputRef}
                className="visually-hidden"
                id="import-file"
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
              />
              <label className="btn" htmlFor="import-file">
                Choose file
              </label>
              <span className="filepick__name">{chosenFileName}</span>
            </div>
          </div>

          <div className="field">
            <span className="label" id="import-mode-label">
              How to apply it
            </span>
            <Select
              id="import-mode"
              labelledBy="import-mode-label"
              options={[
                { value: "merge", label: "Merge \u2014 add what is new" },
                { value: "replace", label: "Replace \u2014 wipe, then load" },
              ]}
              value={importMode}
              onChange={(val) => setImportMode(val as "merge" | "replace")}
            />
          </div>

          <p className="hint">
            The whole file is checked before anything is written, so a broken backup cannot half-import.
          </p>

          <div className="card__actions">
            <button className="btn" type="button" onClick={handleImport}>
              <Icon name="upload" />
              Import
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card danger-zone">
          <h2 className="card__title">Reset</h2>
          <p className="hint">Clears this device and restores the sample library.</p>
          <div className="card__actions">
            <button
              className="btn btn--danger"
              type="button"
              onClick={() => setIsResetDialogOpen(true)}
            >
              <Icon name="trash" />
              Reset library
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2 className="card__title">About</h2>
          <p className="hint">
            SongUnlocked 1.0 \u2014 an offline songbook for tracking what you can actually play. No account, no server, no third-party code.
          </p>
        </div>
      </section>

      {isReplaceDialogOpen && pendingBackupDataRef.current ? (
        <ConfirmDialog
          title="Replace everything?"
          message={`Your current ${songs.length} song${songs.length === 1 ? "" : "s"} will be deleted and replaced by the ${pendingBackupDataRef.current.songs.length} in this file.`}
          confirmLabel="Replace library"
          onConfirm={handleConfirmReplace}
          onClose={() => setIsReplaceDialogOpen(false)}
        />
      ) : null}

      {isResetDialogOpen ? (
        <ConfirmDialog
          title="Reset library"
          message="Every song and instrument on this device is deleted and the sample library is restored. Export a backup first if you want to keep anything."
          confirmLabel="Delete everything"
          onConfirm={handleConfirmReset}
          onClose={() => setIsResetDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
