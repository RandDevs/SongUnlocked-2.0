import { useState, useRef } from "react";
import * as store from "../store.js";
import { useSongs, useActiveInstruments } from "../hooks/useStore.js";
import { useToast } from "../components/ToastContext.js";
import { Icon } from "../components/Icon.js";
import { Select } from "../components/Select.js";

export function HomeView() {
  const songs = useSongs();
  const activeInstruments = useActiveInstruments();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState(
    activeInstruments[0]?.id || "",
  );

  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast("Give the song a title first.", { error: true });
      if (titleInputRef.current) titleInputRef.current.focus();
      return;
    }

    try {
      await store.addSong({
        title: cleanTitle,
        instrumentId: selectedInstrument || activeInstruments[0]?.id || "",
        status: "mastered",
      });
      setTitle("");
      toast(`"${cleanTitle}" saved as Mastered.`);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Something went wrong.",
        { error: true },
      );
    } finally {
      if (titleInputRef.current) titleInputRef.current.focus();
    }
  };

  const stats = store.masteryStats();
  const recent = songs.slice(0, 4);

  return (
    <div>
      <section className="section">
        <div className="card">
          <form className="quickadd" onSubmit={handleQuickAdd}>
            <div className="field">
              <label className="label" htmlFor="quick-title">
                Add a song
              </label>
              <input
                ref={titleInputRef}
                className="input"
                id="quick-title"
                type="text"
                required
                placeholder="Song title"
                autoComplete="off"
                enterKeyHint="done"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="quick-instrument">
                Instrument
              </label>
              <Select
                id="quick-instrument"
                ariaLabel="Instrument"
                options={activeInstruments.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                value={selectedInstrument || activeInstruments[0]?.id || ""}
                onChange={(val) => setSelectedInstrument(val)}
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
          <h2 className="label">Mastery</h2>
        </div>
        <div className="stats">
          {stats.length === 0 ? (
            <div className="empty">
              <p className="empty__title">No instruments yet</p>
              <p>Add an instrument and your mastery breakdown will appear here.</p>
              <a className="btn" href="#/instruments">
                Manage instruments
              </a>
            </div>
          ) : (
            stats.map((entry) => {
              const percent = entry.total
                ? Math.round((entry.mastered / entry.total) * 100)
                : 0;

              return (
                <article key={entry.instrument.id} className="stat">
                  <h3 className="stat__name">{entry.instrument.name}</h3>
                  <div className="stat__figure">
                    <span className="stat__value">{entry.mastered}</span>
                    <span className="stat__of">of {entry.total} mastered</span>
                  </div>
                  <div
                    className="meter"
                    role="img"
                    aria-label={`${percent}% mastered`}
                  >
                    <div
                      className="meter__fill"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="stat__legend">
                    <span>{percent}%</span>
                    <span>{entry.toLearn} to learn</span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="label">Recent activity</h2>
          <a className="count" href="#/library">
            See all
          </a>
        </div>
        <ul className="songlist">
          {recent.length === 0 ? (
            <li className="hint">Nothing logged yet.</li>
          ) : (
            recent.map((song) => (
              <li key={song.id}>
                <a className="songrow" href={`#/song/${song.id}`}>
                  <span
                    className={`songrow__dot ${song.status === "mastered" ? "songrow__dot--mastered" : ""}`}
                  />
                  <span className="songrow__body">
                    <span className="songrow__title">{song.title}</span>
                    <span className="songrow__meta">
                      {[song.artist, store.instrumentName(song.instrumentId)]
                        .filter(Boolean)
                        .join(" \u00b7 ")}
                    </span>
                  </span>
                </a>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
