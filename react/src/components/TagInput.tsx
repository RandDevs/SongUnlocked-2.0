import React, { useState } from "react";
import { Icon } from "./Icon.js";
import { moodHue, moodIconName } from "../moods.js";
import { MAX_TAGS, normalizeTag, tagKey } from "../store.js";

export function MoodChip(props: {
  label: string;
  pressed: boolean;
  onPress: () => void;
  size?: number;
}) {
  const { label, pressed, onPress, size = 15 } = props;
  const iconName = moodIconName(label);
  return (
    <button
      className="moodchip"
      type="button"
      aria-pressed={pressed ? "true" : "false"}
      data-mood={moodHue(label)}
      onClick={onPress}
    >
      {iconName ? <Icon name={iconName} size={size} /> : null}
      <span>{label}</span>
    </button>
  );
}

export interface TagInputProps {
  id: string;
  value?: string[];
  suggestions?: string[];
  onChange?: (tags: string[]) => void;
}

export function TagInput(props: TagInputProps) {
  const { id, value: initialValue = [], suggestions = [], onChange } = props;

  const [chosen, setChosen] = useState<string[]>(() => {
    const list: string[] = [];
    for (const raw of initialValue) {
      const label = normalizeTag(raw);
      if (label && !list.some((tag) => tagKey(tag) === tagKey(label))) {
        list.push(label);
      }
    }
    return list;
  });

  const [typed, setTyped] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const has = (label: string) =>
    chosen.some((tag) => tagKey(tag) === tagKey(label));

  const toggle = (label: string) => {
    const clean = normalizeTag(label);
    if (!clean) return;

    let updated: string[];
    if (has(clean)) {
      updated = chosen.filter((tag) => tagKey(tag) !== tagKey(clean));
      setStatusMessage(null);
    } else {
      if (chosen.length >= MAX_TAGS) {
        setStatusMessage(
          `That is the limit of ${MAX_TAGS} tags. Remove one first.`,
        );
        return;
      }
      updated = [...chosen, clean];
      setStatusMessage(null);
    }

    setChosen(updated);
    onChange?.(updated);
  };

  const addTyped = () => {
    const clean = normalizeTag(typed);
    if (!clean) return;
    if (has(clean)) {
      setStatusMessage(`"${clean}" is already on this song.`);
      setTyped("");
      return;
    }
    toggle(clean);
    setTyped("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTyped();
    }
  };

  const known = suggestions.slice();
  for (const tag of chosen) {
    if (!known.some((item) => tagKey(item) === tagKey(tag))) {
      known.push(tag);
    }
  }

  let statusText = statusMessage;
  if (!statusText) {
    statusText =
      chosen.length === 0
        ? "Optional. Tags are how you find a mood later."
        : `${chosen.length} of ${MAX_TAGS} chosen`;
  }

  return (
    <div className="tagpick">
      <div className="moodgrid">
        {known.map((label) => (
          <MoodChip
            key={label}
            label={label}
            pressed={has(label)}
            onPress={() => toggle(label)}
          />
        ))}
      </div>

      <div className="tagpick__entry">
        <input
          className="input"
          id={id}
          type="text"
          placeholder="Add your own"
          autoComplete="off"
          maxLength={24}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="btn btn--small"
          type="button"
          onClick={addTyped}
        >
          Add
        </button>
      </div>

      <p className="hint">{statusText}</p>
    </div>
  );
}
