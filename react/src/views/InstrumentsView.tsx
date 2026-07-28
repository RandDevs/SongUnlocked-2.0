import React, { useState } from "react";
import * as store from "../store.js";
import { useInstruments } from "../hooks/useStore.js";
import { useToast } from "../components/ToastContext.js";
import { Icon } from "../components/Icon.js";
import { Dialog, ConfirmDialog } from "../components/Dialog.js";

export function InstrumentsView() {
  const instruments = useInstruments();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [editingInstrument, setEditingInstrument] = useState<store.Instrument | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [deletingInstrument, setDeletingInstrument] = useState<store.Instrument | null>(
    null,
  );

  const fail = (error: unknown) =>
    toast(error instanceof Error ? error.message : "Something went wrong.", {
      error: true,
    });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await store.addInstrument(name);
      setName("");
      toast(`${created.name} added.`);
    } catch (error) {
      fail(error);
    }
  };

  const handleOpenRename = (instrument: store.Instrument) => {
    setEditingInstrument(instrument);
    setRenameValue(instrument.name);
  };

  const handleConfirmRename = async () => {
    if (!editingInstrument) return false;
    try {
      await store.renameInstrument(editingInstrument.id, renameValue);
      toast("Instrument renamed.");
      setEditingInstrument(null);
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingInstrument) return;
    try {
      await store.deleteInstrument(deletingInstrument.id);
      toast(`${deletingInstrument.name} deleted.`);
      setDeletingInstrument(null);
    } catch (error) {
      fail(error);
    }
  };

  return (
    <div>
      <div className="section__head">
        <h1 className="label">Instruments</h1>
      </div>

      <section className="section">
        <div className="card">
          <form className="quickadd quickadd--inline" onSubmit={handleAdd}>
            <div className="field">
              <label className="label" htmlFor="instrument-name">
                Add instrument
              </label>
              <input
                className="input"
                id="instrument-name"
                type="text"
                required
                placeholder="e.g. Classical Guitar"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button className="btn btn--primary" type="submit">
              <Icon name="plus" />
              Add
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="label">Your instruments</h2>
        </div>

        <div className="rows">
          {instruments.length === 0 ? (
            <div className="empty">
              <p className="empty__title">No instruments</p>
              <p>Add one above to start logging songs.</p>
            </div>
          ) : (
            instruments.map((instrument) => {
              const songCount = store.songCountFor(instrument.id);
              return (
                <div
                  key={instrument.id}
                  className={`row ${instrument.archived ? "row--archived" : ""}`}
                >
                  <div className="row__body">
                    <p className="row__name">{instrument.name}</p>
                    <p className="row__meta">
                      {[
                        `${songCount} song${songCount === 1 ? "" : "s"}`,
                        instrument.archived ? "Archived" : null,
                      ]
                        .filter(Boolean)
                        .join(" \u00b7 ")}
                    </p>
                  </div>

                  <div className="row__actions">
                    <button
                      className="btn btn--ghost btn--icon"
                      type="button"
                      aria-label={`Rename ${instrument.name}`}
                      onClick={() => handleOpenRename(instrument)}
                    >
                      <Icon name="pencil" />
                    </button>

                    <button
                      className="btn btn--ghost btn--icon"
                      type="button"
                      aria-label={
                        instrument.archived
                          ? `Restore ${instrument.name}`
                          : `Archive ${instrument.name}`
                      }
                      onClick={async () => {
                        try {
                          await store.setInstrumentArchived(
                            instrument.id,
                            !instrument.archived,
                          );
                          toast(
                            instrument.archived
                              ? `${instrument.name} restored.`
                              : `${instrument.name} archived.`,
                          );
                        } catch (error) {
                          fail(error);
                        }
                      }}
                    >
                      <Icon name={instrument.archived ? "restore" : "archive"} />
                    </button>

                    {songCount === 0 ? (
                      <button
                        className="btn btn--danger-ghost btn--icon"
                        type="button"
                        aria-label={`Delete ${instrument.name}`}
                        onClick={() => setDeletingInstrument(instrument)}
                      >
                        <Icon name="trash" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="hint hint--spaced">
          Archiving keeps an instrument's songs but hides it from pickers and stats. Deleting is only offered once an instrument has no songs left.
        </p>
      </section>

      {editingInstrument ? (
        <Dialog
          title="Rename instrument"
          confirmLabel="Save"
          onConfirm={handleConfirmRename}
          onClose={() => setEditingInstrument(null)}
        >
          <div className="field">
            <label className="label">Name</label>
            <input
              className="input"
              type="text"
              autoComplete="off"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </div>
        </Dialog>
      ) : null}

      {deletingInstrument ? (
        <ConfirmDialog
          title="Delete instrument"
          message={`${deletingInstrument.name} will be removed permanently. This cannot be undone.`}
          confirmLabel="Delete instrument"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingInstrument(null)}
        />
      ) : null}
    </div>
  );
}
