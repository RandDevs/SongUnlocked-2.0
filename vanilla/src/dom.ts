/**
 * Tiny DOM builder.
 *
 * Everything in this app is built from real DOM nodes rather than HTML strings.
 * Two reasons: user text can never be interpreted as markup (no XSS surface),
 * and we can hold on to a node across updates instead of replacing it — which
 * is what keeps the search field from losing focus while you type.
 */

type Child = Node | string | number | boolean | null | undefined | Child[];

function append(parent: Node | DocumentFragment, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) {
      append(parent, child);
      continue;
    }
    parent.appendChild(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  }
}

export function h(
  tag: string,
  props?: Record<string, unknown> | null,
  ...children: Child[]
): HTMLElement {
  const el = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;

      if (key === "class") {
        el.className = value as string;
      } else if (key === "text") {
        el.textContent = String(value);
      } else if (key === "dataset") {
        Object.assign(el.dataset, value);
      } else if (key === "for") {
        el.setAttribute("for", String(value));
      } else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(
          key.slice(2).toLowerCase(),
          value as EventListener,
        );
      } else if (key in el) {
        // Dynamic property set (e.g. value, checked) — the key has already
        // been verified to exist on the element via `key in el`.
        (el as unknown as Record<string, unknown>)[key] = value;
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }

  append(el, children);
  return el;
}

export function fragment(...children: Child[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  append(frag, children);
  return frag;
}

export function empty(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Replace the contents of a container without touching the container itself.
 */
export function fill(el: Element, ...children: Child[]): void {
  empty(el);
  append(el, children);
}

export function qs(selector: string): Element | null {
  return document.querySelector(selector);
}
