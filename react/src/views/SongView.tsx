import React, { useState, useEffect, useRef } from "react";
import * as store from "../store.js";
import { useSongs } from "../hooks/useStore.js";
import { useToast } from "../components/ToastContext.js";
import { parseSheet, chordsUsed } from "../chordsheet.js";
import { createAutoscroll, MIN_SPEED, MAX_SPEED } from "../autoscroll.js";
import { Icon } from "../components/Icon.js";
import { Dialog, ConfirmDialog } from "../components/Dialog.js";
import { SongForm, type SongFormValues } from "../components/SongForm.js";
import { moodHue, moodIconName } from "../moods.js";

const SIZE_KEY = "songunlocked-react:sheet-size";
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

export function SongView(props: { songId: string; navigate: (hash: string) => void }) {
  const { songId, navigate } = props;
  useSongs();
  const { toast } = useToast();

  const song = store.getSong(songId);

  const [sheetSize, setSheetSize] = useState<number>(loadSheetSize);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(32);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const editSongFormRef = useRef<SongFormValues | null>(null);

  const autoscrollRef = useRef<ReturnType<typeof createAutoscroll> | null>(null);

  const onStateChangeRef = useRef((playing: boolean) => {
    setIsPlaying(playing);
  });

  useEffect(() => {
    onStateChangeRef.current = (playing: boolean) => {
      setIsPlaying(playing);
    };
  });

  useEffect(() => {
    applySheetSize(sheetSize);
  }, [sheetSize]);

  useEffect(() => {
    const currentSong = store.getSong(songId);
    if (!currentSong) return;

    const engine = createAutoscroll({
      onStateChange: (playing) => onStateChangeRef.current(playing),
    });
    autoscrollRef.current = engine;
    setSpeedState(engine.getSpeed());

    return () => {
      engine.destroy();
      autoscrollRef.current = null;
    };
  }, [songId]);

  if (!song) {
    return (
      <div className="empty">
        <p className="empty__title">Song not found</p>
        <p>It may have been deleted.</p>
        <a className="btn" href="#/library">
          Back to library
        </a>
      </div>
    );
  }

  const chords = chordsUsed(song.content);
  const isMastered = song.status === "mastered";

  const handleTogglePlay = () => {
    autoscrollRef.current?.toggle();
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextSpeed = Number(e.target.value);
    if (autoscrollRef.current) {
      const applied = autoscrollRef.current.setSpeed(nextSpeed);
      setSpeedState(applied);
    }
  };

  const handleChangeSize = (delta: number) => {
    const next = Math.min(MAX_SIZE, Math.max(MIN_SIZE, sheetSize + delta));
    setSheetSize(next);
  };

  const handleSaveEdit = async () => {
    const values = editSongFormRef.current;
    if (!values) return false;

    try {
      await store.updateSong(songId, values);
      toast("Changes saved.");
      setIsEditDialogOpen(false);
      return true;
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not save changes.",
        { error: true },
      );
      return false;
    }
  };

  const handleDeleteConfirm = async () => {
    await store.deleteSong(songId);
    toast(`"${song.title}" deleted.`);
    setIsDeleteDialogOpen(false);
    navigate("#/library");
  };

  const handleMarkMastered = async () => {
    try {
      const updated = await store.toggleStatus(songId);
      toast(`Marked as ${store.statusLabel(updated.status)}.`);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not update the status.",
        { error: true },
      );
    }
  };

  const lines = parseSheet(song.content);

  return (
    <div>
      <header className="songhead">
        <a className="backlink" href="#/library">
          <Icon name="chevronLeft" size={18} />
          Library
        </a>

        <div className="songhead__top">
          <div className="songhead__ident">
            <h1 className="songhead__title">{song.title}</h1>
            {song.artist ? (
              <p className="songhead__artist">{song.artist}</p>
            ) : null}
          </div>

          <div className="songhead__tools">
            <button
              className="btn btn--ghost btn--icon"
              type="button"
              aria-label="Edit song"
              title="Edit song"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Icon name="pencil" />
            </button>
            <button
              className="btn btn--danger-ghost btn--icon"
              type="button"
              aria-label="Delete song"
              title="Delete song"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Icon name="trash" />
            </button>
          </div>
        </div>

        <div className="songhead__facts">
          <span className={`badge ${isMastered ? "badge--mastered" : ""}`}>
            {store.statusLabel(song.status)}
          </span>
          <span className="badge badge--plain">
            {store.instrumentName(song.instrumentId)}
          </span>
          <span className="badge badge--plain">
            {store.cleanCapo(song.capo) === 0
              ? "No capo"
              : `Capo ${store.cleanCapo(song.capo)}`}
          </span>
          {store.cleanTags(song.tags).map((tag) => {
            const iconName = moodIconName(tag);
            return (
              <span
                key={tag}
                className="badge badge--mood"
                data-mood={moodHue(tag)}
              >
                {iconName ? <Icon name={iconName} size={14} /> : null}
                <span>{tag}</span>
              </span>
            );
          })}
        </div>

        {chords.length > 0 ? (
          <div className="songhead__chords">
            <span className="songhead__chordlabel">Chords</span>
            <span className="songhead__chordlist">{chords.join("  ")}</span>
          </div>
        ) : null}

        {!isMastered ? (
          <div className="songhead__actions">
            <button
              className="btn btn--primary"
              type="button"
              onClick={handleMarkMastered}
            >
              <Icon name="check" />
              Mark as Mastered
            </button>
          </div>
        ) : null}
      </header>

      <pre className="sheet" tabIndex={0}>
        {!song.content.trim() ? (
          <div className="empty">
            <p className="empty__title">No chords yet</p>
            <p>Use Edit to paste a chord sheet for this song.</p>
          </div>
        ) : (
          lines.map((line, index) => {
            const text = index === lines.length - 1 ? line.text : `${line.text}\n`;
            if (line.kind === "chords") {
              return (
                <span key={index} className="sheet__chords">
                  {text}
                </span>
              );
            }
            if (line.kind === "section") {
              return (
                <span key={index} className="sheet__section">
                  {text}
                </span>
              );
            }
            return text;
          })
        )}
      </pre>

      <div style={{ height: "120px" }} />

      <div className="transport">
        <div className="transport__inner">
          <button
            className="transport__play"
            type="button"
            aria-label={isPlaying ? "Pause autoscroll" : "Start autoscroll"}
            data-playing={isPlaying ? "true" : "false"}
            onClick={handleTogglePlay}
          >
            <Icon name={isPlaying ? "pause" : "play"} size={22} />
          </button>

          <div className="transport__speed">
            <div className="transport__readout">
              <span>Autoscroll</span>
              <span>{speed} px/s</span>
            </div>
            <input
              className="slider"
              type="range"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step="1"
              value={speed}
              aria-label="Scroll speed"
              onChange={handleSpeedChange}
            />
          </div>

          <div className="transport__size">
            <button
              className="sizebtn"
              type="button"
              aria-label="Smaller text"
              onClick={() => handleChangeSize(-1)}
            >
              A−
            </button>
            <button
              className="sizebtn"
              type="button"
              aria-label="Larger text"
              onClick={() => handleChangeSize(1)}
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {isEditDialogOpen ? (
        <Dialog
          title="Edit song"
          confirmLabel="Save changes"
          onConfirm={handleSaveEdit}
          onClose={() => setIsEditDialogOpen(false)}
        >
          <SongForm
            initial={song}
            onChange={(values) => {
              editSongFormRef.current = values;
            }}
          />
        </Dialog>
      ) : null}

      {isDeleteDialogOpen ? (
        <ConfirmDialog
          title="Delete song"
          message={`"${song.title}" will be removed from your library. This cannot be undone.`}
          confirmLabel="Delete song"
          onConfirm={handleDeleteConfirm}
          onClose={() => setIsDeleteDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
