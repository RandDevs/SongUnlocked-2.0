import { useState, useRef } from "react";
import * as store from "../store.js";
import { useSongs, useActiveInstruments } from "../hooks/useStore.js";
import { useToast } from "../components/ToastContext.js";
import { Icon } from "../components/Icon.js";
import { Select } from "../components/Select.js";
import { MoodChip } from "../components/TagInput.js";
import { Dialog } from "../components/Dialog.js";
import { SongForm, type SongFormValues } from "../components/SongForm.js";

const FILTER_KEY = "songunlocked-react:filters";

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
    // ignored
  }
}

function capoLabel(value: number): string {
  return value === 0 ? "No capo" : `Capo ${value}`;
}

export function LibraryView() {
  useSongs();
  const activeInstruments = useActiveInstruments();
  const { toast } = useToast();

  const [filters, setFilters] = useState<FilterState>(() => ({
    query: "",
    instrumentId: "all",
    status: "all",
    capo: "all",
    tags: [],
    ...(loadFilters() || {}),
  }));

  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const newSongFormRef = useRef<SongFormValues | null>(null);

  const commitFilters = (next: FilterState) => {
    saveFilters(next);
    setFilters(next);
  };

  const anyActive =
    filters.instrumentId !== "all" ||
    filters.status !== "all" ||
    filters.capo !== "all" ||
    filters.tags.length > 0;

  const clearFilters = () => {
    commitFilters({
      ...filters,
      instrumentId: "all",
      status: "all",
      capo: "all",
      tags: [],
    });
  };

  const filteredSongs = store.findSongs(filters);
  const totalSongs = store.getSongs().length;
  const moodsInUse = store.tagsInUse();

  const handleOpenNewSong = () => {
    if (activeInstruments.length === 0) {
      toast("Add an instrument before adding songs.", { error: true });
      return;
    }
    setIsNewDialogOpen(true);
  };

  const handleSaveNewSong = async () => {
    const values = newSongFormRef.current;
    if (!values) return false;

    try {
      const song = await store.addSong(values);
      toast(`"${song.title}" added.`);
      setIsNewDialogOpen(false);
      return true;
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not save the song.",
        { error: true },
      );
      return false;
    }
  };

  return (
    <div>
      <div className="section__head">
        <h1 className="label">Library</h1>
        <button
          className="btn btn--primary"
          type="button"
          onClick={handleOpenNewSong}
        >
          <Icon name="plus" />
          New song
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <span className="search__icon">
            <Icon name="search" size={18} />
          </span>
          <label className="visually-hidden" htmlFor="library-search">
            Search
          </label>
          <input
            className="input"
            type="search"
            id="library-search"
            placeholder="Search title or artist"
            autoComplete="off"
            value={filters.query}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, query: e.target.value }))
            }
          />
        </div>

        <div className="filtergrid">
          <div className="pickfield">
            <label className="pickfield__label" htmlFor="filter-instrument">
              Instrument
            </label>
            <Select
              id="filter-instrument"
              ariaLabel="Filter by instrument"
              dataActive={filters.instrumentId !== "all"}
              options={[
                { value: "all", label: "All instruments" },
                ...activeInstruments.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
              value={filters.instrumentId}
              onChange={(val) =>
                commitFilters({ ...filters, instrumentId: val })
              }
            />
          </div>

          <div className="pickfield">
            <label className="pickfield__label" htmlFor="filter-status">
              Status
            </label>
            <Select
              id="filter-status"
              ariaLabel="Filter by status"
              dataActive={filters.status !== "all"}
              options={[
                { value: "all", label: "Any status" },
                ...store.STATUSES.map((val) => ({
                  value: val,
                  label: store.statusLabel(val),
                })),
              ]}
              value={filters.status}
              onChange={(val) =>
                commitFilters({
                  ...filters,
                  status: val as store.Status | "all",
                })
              }
            />
          </div>

          <div className="pickfield">
            <label className="pickfield__label" htmlFor="filter-capo">
              Capo
            </label>
            <Select
              id="filter-capo"
              ariaLabel="Filter by capo position"
              dataActive={filters.capo !== "all"}
              options={[
                { value: "all", label: "Any capo" },
                ...store
                  .capoValues()
                  .map((val) => ({ value: String(val), label: capoLabel(val) })),
              ]}
              value={String(filters.capo)}
              onChange={(val) =>
                commitFilters({
                  ...filters,
                  capo: val === "all" ? "all" : Number(val),
                })
              }
            />
          </div>
        </div>

        {moodsInUse.length > 0 ? (
          <div className="moodrow" id="filter-moods">
            {moodsInUse.map(({ label }) => {
              const isPressed = filters.tags.some(
                (tag) => store.tagKey(tag) === store.tagKey(label),
              );
              return (
                <MoodChip
                  key={label}
                  label={label}
                  pressed={isPressed}
                  onPress={() => {
                    const key = store.tagKey(label);
                    const updatedTags = isPressed
                      ? filters.tags.filter((tag) => store.tagKey(tag) !== key)
                      : [...filters.tags, label];
                    commitFilters({ ...filters, tags: updatedTags });
                  }}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="resulthead">
        <p className="count">
          {filteredSongs.length === totalSongs
            ? `${totalSongs} song${totalSongs === 1 ? "" : "s"}`
            : `${filteredSongs.length} of ${totalSongs} songs`}
        </p>

        <button
          className="btn btn--ghost btn--small"
          type="button"
          id="clear-filters"
          hidden={!anyActive}
          onClick={clearFilters}
        >
          Clear
        </button>
      </div>

      <ul className="songlist">
        {filteredSongs.length === 0 ? (
          <li>
            <div className="empty">
              <p className="empty__title">
                {totalSongs === 0 ? "Your library is empty" : "No matches"}
              </p>
              <p>
                {totalSongs === 0
                  ? "Add your first song and it will show up here."
                  : "Try a different search term or clear the filters."}
              </p>
            </div>
          </li>
        ) : (
          filteredSongs.map((song) => {
            const capo = store.cleanCapo(song.capo);
            return (
              <li key={song.id}>
                <a className="songrow" href={`#/song/${song.id}`}>
                  <span
                    className={`songrow__dot ${song.status === "mastered" ? "songrow__dot--mastered" : ""}`}
                    title={store.statusLabel(song.status)}
                  />
                  <span className="songrow__body">
                    <span className="songrow__title">{song.title}</span>
                    <span className="songrow__meta">
                      {[song.artist, store.instrumentName(song.instrumentId)]
                        .filter(Boolean)
                        .join(" \u00b7 ")}
                    </span>
                  </span>
                  {capo > 0 ? (
                    <span className="capotag">Capo {capo}</span>
                  ) : null}
                  <Icon
                    name="chevronLeft"
                    size={18}
                    style={{ transform: "rotate(180deg)", opacity: 0.35 }}
                  />
                </a>
              </li>
            );
          })
        )}
      </ul>

      {isNewDialogOpen ? (
        <Dialog
          title="New song"
          confirmLabel="Save song"
          onConfirm={handleSaveNewSong}
          onClose={() => setIsNewDialogOpen(false)}
        >
          <SongForm
            onChange={(values) => {
              newSongFormRef.current = values;
            }}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
