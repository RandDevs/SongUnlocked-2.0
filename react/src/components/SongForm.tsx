import { useState, useEffect } from "react";
import * as store from "../store.js";
import { Select } from "./Select.js";
import { TagInput } from "./TagInput.js";

const PLACEHOLDER = [
  "[Verse 1]",
  "C               G",
  "Type the chord line, then the lyric under it",
].join("\n");

function capoLabel(value: number): string {
  return value === 0 ? "No capo" : `Capo ${value}`;
}

export interface SongFormValues {
  title: string;
  artist: string;
  instrumentId: string;
  status: store.Status;
  capo: number;
  tags: string[];
  content: string;
}

export interface SongFormProps {
  initial?: Partial<store.Song>;
  onChange?: (values: SongFormValues) => void;
}

export function SongForm(props: SongFormProps) {
  const { initial = {}, onChange } = props;
  const instruments = store.getActiveInstruments();

  const [title, setTitle] = useState(initial.title || "");
  const [artist, setArtist] = useState(initial.artist || "");
  const [instrumentId, setInstrumentId] = useState(
    initial.instrumentId || instruments[0]?.id || "",
  );
  const [status, setStatus] = useState<store.Status>(
    initial.status || "mastered",
  );
  const [capo, setCapo] = useState<number>(store.cleanCapo(initial.capo));
  const [tags, setTags] = useState<string[]>(initial.tags || []);
  const [content, setContent] = useState(initial.content || "");

  useEffect(() => {
    onChange?.({
      title,
      artist,
      instrumentId,
      status,
      capo,
      tags,
      content,
    });
  }, []);

  const notifyChange = (updated: Partial<SongFormValues>) => {
    onChange?.({
      title: updated.title ?? title,
      artist: updated.artist ?? artist,
      instrumentId: updated.instrumentId ?? instrumentId,
      status: updated.status ?? status,
      capo: updated.capo ?? capo,
      tags: updated.tags ?? tags,
      content: updated.content ?? content,
    });
  };

  return (
    <div className="stack">
      <div className="field">
        <label className="label" htmlFor="song-title">
          Title
        </label>
        <input
          className="input"
          id="song-title"
          type="text"
          required
          value={title}
          placeholder="Song title"
          autoComplete="off"
          onChange={(e) => {
            setTitle(e.target.value);
            notifyChange({ title: e.target.value });
          }}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="song-artist">
          Artist
        </label>
        <input
          className="input"
          id="song-artist"
          type="text"
          value={artist}
          placeholder="Artist"
          autoComplete="off"
          onChange={(e) => {
            setArtist(e.target.value);
            notifyChange({ artist: e.target.value });
          }}
        />
      </div>

      <div className="grid2">
        <div className="field">
          <span className="label" id="song-instrument-label">
            Instrument
          </span>
          <Select
            id="song-instrument"
            labelledBy="song-instrument-label"
            options={instruments.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            value={instrumentId}
            onChange={(val) => {
              setInstrumentId(val);
              notifyChange({ instrumentId: val });
            }}
          />
        </div>

        <div className="field">
          <span className="label" id="song-status-label">
            Status
          </span>
          <Select
            id="song-status"
            labelledBy="song-status-label"
            options={store.STATUSES.map((val) => ({
              value: val,
              label: store.statusLabel(val),
            }))}
            value={status}
            onChange={(val) => {
              const s = val as store.Status;
              setStatus(s);
              notifyChange({ status: s });
            }}
          />
        </div>
      </div>

      <div className="field">
        <span className="label" id="song-capo-label">
          Capo
        </span>
        <Select
          id="song-capo"
          labelledBy="song-capo-label"
          options={Array.from({ length: store.MAX_CAPO + 1 }, (_, fret) => ({
            value: String(fret),
            label: capoLabel(fret),
          }))}
          value={String(capo)}
          onChange={(val) => {
            const c = Number(val);
            setCapo(c);
            notifyChange({ capo: c });
          }}
        />
      </div>

      <div className="field">
        <span className="label" id="song-tags-label">
          Mood tags
        </span>
        <TagInput
          id="song-tags"
          value={tags}
          suggestions={store.suggestedTags()}
          onChange={(updatedTags) => {
            setTags(updatedTags);
            notifyChange({ tags: updatedTags });
          }}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="song-content">
          Chords and lyrics
        </label>
        <textarea
          className="textarea"
          id="song-content"
          spellCheck={false}
          placeholder={PLACEHOLDER}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            notifyChange({ content: e.target.value });
          }}
        />
        <p className="hint">
          Put each chord line directly above its lyric line. Spacing is preserved exactly as typed.
        </p>
      </div>
    </div>
  );
}
