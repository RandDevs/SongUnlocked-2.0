/**
 * Tag picker.
 *
 * Free text alone rots fast: "sad", "Sad" and "sadd" become three tags in a
 * week and the filter stops being useful. Presets alone are too rigid for
 * anyone's actual habits. So both: toggle a suggestion, or type your own and it
 * gets normalized on the way in.
 *
 * Layout note: the presets are a wrapping grid of equal-height chips, and the
 * text entry sits on its own line underneath with a plain word for a button.
 * An icon-only square next to a full-width field reads as a third control of
 * unknown purpose; "Add" does not.
 */

import { h } from "../dom.js";
import { icon } from "../icons.js";
import { moodHue, moodIconName } from "../moods.js";
import { MAX_TAGS, normalizeTag, tagKey } from "../store.js";

export interface MoodChipConfig {
  label: string;
  pressed: boolean;
  onPress: () => void;
  size?: number;
}

/**
 * A chip that carries its mood hue and icon. Shared with the library filter so
 * the same tag never looks like two different things on two screens.
 */
export function moodChip(config: MoodChipConfig): HTMLElement {
  const iconName = moodIconName(config.label);
  return h(
    "button",
    {
      class: "moodchip",
      type: "button",
      "aria-pressed": String(config.pressed),
      dataset: { mood: moodHue(config.label) },
      onclick: config.onPress,
    },
    iconName ? icon(iconName, config.size || 15) : null,
    h("span", { text: config.label }),
  );
}

export interface TagInputConfig {
  id: string;
  value?: string[];
  suggestions?: string[];
}

export interface TagInputInstance {
  node: HTMLElement;
  values: () => string[];
}

export function createTagInput(config: TagInputConfig): TagInputInstance {
  let chosen: string[] = [];
  for (const raw of config.value || []) {
    const label = normalizeTag(raw);
    if (label && !chosen.some((tag) => tagKey(tag) === tagKey(label))) {
      chosen.push(label);
    }
  }

  const suggestions = (config.suggestions || []).filter(Boolean);

  const chips = h("div", { class: "moodgrid" });
  const status = h("p", { class: "hint" });

  const field = h("input", {
    class: "input",
    id: config.id,
    type: "text",
    placeholder: "Add your own",
    autocomplete: "off",
    maxlength: 24,
  }) as HTMLInputElement;

  const addButton = h(
    "button",
    {
      class: "btn btn--small",
      type: "button",
      onclick: () => addTyped(),
    },
    "Add",
  );

  function has(label: string): boolean {
    return chosen.some((tag) => tagKey(tag) === tagKey(label));
  }

  function toggle(label: string): void {
    const clean = normalizeTag(label);
    if (!clean) return;

    if (has(clean)) {
      chosen = chosen.filter((tag) => tagKey(tag) !== tagKey(clean));
    } else {
      if (chosen.length >= MAX_TAGS) {
        status.textContent = `That is the limit of ${MAX_TAGS} tags. Remove one first.`;
        return;
      }
      chosen = [...chosen, clean];
    }
    paint();
  }

  function addTyped(): void {
    const clean = normalizeTag(field.value);
    if (!clean) {
      field.focus();
      return;
    }
    if (has(clean)) {
      status.textContent = `"${clean}" is already on this song.`;
      field.value = "";
      field.focus();
      return;
    }
    toggle(clean);
    field.value = "";
    field.focus();
  }

  field.addEventListener("keydown", (event: KeyboardEvent) => {
    // Enter inside a dialog would submit the whole form; here it means
    // "finish this tag".
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTyped();
    }
  });

  function paint(): void {
    const known = suggestions.slice();
    for (const tag of chosen) {
      if (!known.some((item) => tagKey(item) === tagKey(tag))) known.push(tag);
    }

    chips.replaceChildren();
    for (const label of known) {
      chips.appendChild(
        moodChip({
          label,
          pressed: has(label),
          onPress: () => toggle(label),
        }),
      );
    }

    if (chosen.length === 0) {
      status.textContent = "Optional. Tags are how you find a mood later.";
    } else {
      status.textContent = `${chosen.length} of ${MAX_TAGS} chosen`;
    }
  }

  paint();

  const node = h(
    "div",
    { class: "tagpick" },
    chips,
    h("div", { class: "tagpick__entry" }, field, addButton),
    status,
  );

  return {
    node,
    values() {
      return chosen.slice();
    },
  };
}
