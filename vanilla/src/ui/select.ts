/**
 * Custom dropdown.
 *
 * Why not a native <select>: the closed control can be styled, but the open
 * list is drawn by the operating system and ignores every token in this design
 * system. On a dark theme that shows up as a bright white list with foreign
 * fonts and corners.
 *
 * The trade-off is that everything a native select gives away for free has to
 * be written here on purpose: roving focus, type-ahead, Home/End, Escape,
 * outside-click, and the combobox/listbox ARIA contract. A half-built custom
 * dropdown is worse than the native one, so none of it is optional.
 */

import { h } from "../dom.js";
import { icon } from "../icons.js";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectConfig {
  id: string;
  options: SelectOption[];
  value?: string;
  ariaLabel?: string;
  labelledBy?: string;
  onChange?: (value: string) => void;
}

export interface SelectInstance {
  node: HTMLElement;
  trigger: HTMLButtonElement;
  readonly value: string;
  setValue: (next: string) => void;
  setOptions: (next: SelectOption[]) => void;
  destroy: () => void;
}

export function createSelect(config: SelectConfig): SelectInstance {
  let options = config.options.slice();
  let value = config.value ?? options[0]?.value ?? "";
  let open = false;
  let activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  /** Type-ahead buffer, cleared after a pause like a native select does. */
  let typed = "";
  let typedTimer: ReturnType<typeof setTimeout> | undefined;

  const caret = h("span", { class: "pick__caret" }, icon("chevronDown", 16));
  const text = h("span", { class: "pick__text" });

  const trigger = h(
    "button",
    {
      class: "pick__trigger",
      type: "button",
      id: config.id,
      role: "combobox",
      "aria-expanded": "false",
      "aria-haspopup": "listbox",
      ...(config.ariaLabel ? { "aria-label": config.ariaLabel } : {}),
      ...(config.labelledBy ? { "aria-labelledby": config.labelledBy } : {}),
    },
    text,
    caret,
  ) as HTMLButtonElement;

  const list = h("div", {
    class: "pick__list",
    role: "listbox",
    id: `${config.id}-list`,
    hidden: true,
    tabindex: "-1",
  });

  const node = h("div", { class: "pick" }, trigger, list);

  function currentLabel(): string {
    const found = options.find((option) => option.value === value);
    return found ? found.label : "";
  }

  function paintTrigger(): void {
    text.textContent = currentLabel();
  }

  function paintList(): void {
    list.replaceChildren();
    options.forEach((option, index) => {
      const selected = option.value === value;
      const item = h(
        "div",
        {
          class: "pick__option",
          role: "option",
          id: `${config.id}-option-${index}`,
          "aria-selected": String(selected),
          dataset: { index: String(index) },
          onclick: () => commit(index),
          onmousemove: () => setActive(index, false),
        },
        h(
          "span",
          { class: "pick__check" },
          selected ? icon("check", 16) : null,
        ),
        h("span", { text: option.label }),
      );
      list.appendChild(item);
    });
    markActive();
  }

  function markActive(): void {
    const items = [...list.children];
    items.forEach((item, index) => {
      if (index === activeIndex) item.setAttribute("data-active", "true");
      else item.removeAttribute("data-active");
    });
    const active = items[activeIndex];
    if (active) {
      trigger.setAttribute("aria-activedescendant", active.id);
      if (open) active.scrollIntoView({ block: "nearest" });
    } else {
      trigger.removeAttribute("aria-activedescendant");
    }
  }

  function setActive(index: number, scroll = true): void {
    if (options.length === 0) return;
    activeIndex = (index + options.length) % options.length;
    markActive();
    if (scroll) markActive();
  }

  function openList(): void {
    if (open || options.length === 0) return;
    open = true;
    list.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-controls", list.id);
    setActive(options.findIndex((option) => option.value === value));
    document.addEventListener("pointerdown", onOutsidePointer, true);
  }

  function closeList({ focusTrigger = false } = {}): void {
    if (!open) return;
    open = false;
    list.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", onOutsidePointer, true);
    if (focusTrigger) trigger.focus();
  }

  function onOutsidePointer(event: Event): void {
    if (event.target instanceof Node && !node.contains(event.target)) {
      closeList();
    }
  }

  function commit(index: number): void {
    const option = options[index];
    closeList({ focusTrigger: true });
    if (!option || option.value === value) return;
    value = option.value;
    paintTrigger();
    paintList();
    config.onChange?.(value);
  }

  function typeahead(char: string): void {
    clearTimeout(typedTimer);
    typed += char.toLowerCase();
    typedTimer = setTimeout(() => {
      typed = "";
    }, 700);

    const found = options.findIndex((option) =>
      option.label.toLowerCase().startsWith(typed),
    );
    if (found >= 0) {
      if (open) setActive(found);
      else commit(found);
    }
  }

  trigger.addEventListener("click", () => {
    if (open) closeList();
    else openList();
  });

  trigger.addEventListener("keydown", (event: KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (open) setActive(activeIndex + 1);
        else openList();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open) setActive(activeIndex - 1);
        else openList();
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActive(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
      case "Spacebar":
        event.preventDefault();
        if (open) commit(activeIndex);
        else openList();
        break;
      case "Escape":
        if (open) {
          // Stop here: inside a dialog this key would otherwise close the
          // whole dialog while the user only meant to dismiss the list.
          event.preventDefault();
          event.stopPropagation();
          closeList({ focusTrigger: true });
        }
        break;
      case "Tab":
        closeList();
        break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          typeahead(event.key);
        }
    }
  });

  paintTrigger();
  paintList();

  return {
    node,
    trigger,

    get value() {
      return value;
    },

    setValue(next: string) {
      if (!options.some((option) => option.value === next)) return;
      value = next;
      paintTrigger();
      paintList();
    },

    setOptions(next: SelectOption[]) {
      options = next.slice();
      if (!options.some((option) => option.value === value)) {
        value = options[0]?.value ?? "";
      }
      paintTrigger();
      paintList();
    },

    destroy() {
      clearTimeout(typedTimer);
      document.removeEventListener("pointerdown", onOutsidePointer, true);
    },
  };
}
