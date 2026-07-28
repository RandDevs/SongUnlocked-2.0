/**
 * Boot and routing.
 *
 * Routes live in the hash so the app works from any static host and from the
 * filesystem. Each screen owns its own DOM subtree and returns a cleanup
 * function; the router guarantees cleanup runs before the next screen mounts,
 * which is what keeps the autoscroll loop and store subscriptions from leaking.
 */

import { h, fill } from "./dom.js";
import * as store from "./store.js";
import { buildShell } from "./ui/shell.js";
import { homeView } from "./views/home.js";
import { libraryView } from "./views/library.js";
import { songView, loadSheetSize } from "./views/song.js";
import { instrumentsView } from "./views/instruments.js";
import { settingsView } from "./views/settings.js";

export interface ViewContext {
  toast: (message: string, options?: { error?: boolean }) => void;
  navigate: (hash: string) => void;
}

export interface ViewInstance {
  node: Node;
  cleanup?: () => void;
}

const root = document.getElementById("app");
if (!(root instanceof HTMLElement)) throw new Error("Missing #app element.");

const shell = buildShell();

const ctx: ViewContext = {
  toast: (message, options) => shell.toast(message, options),
  navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  },
};

let current: ViewInstance | null = null;

function parseRoute(): { route: string; param: string } {
  const raw = location.hash.replace(/^#\/?/, "");
  const [route, param] = raw.split("/");
  return { route: route || "home", param: param || "" };
}

function render(): void {
  const { route, param } = parseRoute();

  for (const dialog of document.querySelectorAll("dialog[open]")) {
    (dialog as HTMLDialogElement).close();
  }

  if (current?.cleanup) current.cleanup();
  current = null;

  let view: ViewInstance;

  switch (route) {
    case "library":
      view = libraryView(ctx);
      break;
    case "song":
      view = songView(ctx, param);
      break;
    case "instruments":
      view = instrumentsView(ctx);
      break;
    case "settings":
      view = settingsView(ctx);
      break;
    case "home":
      view = homeView(ctx);
      break;
    default:
      view = {
        node: h(
          "div",
          { class: "empty" },
          h("p", { class: "empty__title" }, "Nothing here"),
          h("a", { class: "btn", href: "#/home" }, "Go home"),
        ),
      };
  }

  current = view;
  shell.setActiveTab(route === "song" ? "library" : route);
  fill(shell.main, view.node);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);

/* ---------- Swipe between tabs ---------- */

const SWIPE_TABS = ["home", "library", "instruments", "settings"];
const SWIPE_MIN_DISTANCE = 64;
const SWIPE_DIRECTION_RATIO = 1.6;
const SWIPE_EDGE_GUARD = 24;

function startsInsideHorizontalScroller(target: EventTarget | null): boolean {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 4) {
      const overflow = getComputedStyle(node).overflowX;
      if (overflow === "auto" || overflow === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

function installSwipeNavigation(): void {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  window.addEventListener(
    "touchstart",
    (event: TouchEvent) => {
      tracking = false;
      if (event.touches.length !== 1) return;
      if (document.querySelector("dialog[open]")) return;
      if (!SWIPE_TABS.includes(parseRoute().route)) return;

      const touch = event.touches[0];
      if (
        touch.clientX < SWIPE_EDGE_GUARD ||
        touch.clientX > window.innerWidth - SWIPE_EDGE_GUARD
      ) {
        return;
      }
      if (startsInsideHorizontalScroller(event.target)) return;

      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchend",
    (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_DIRECTION_RATIO) return;

      const index = SWIPE_TABS.indexOf(parseRoute().route);
      if (index < 0) return;

      const next = index + (dx < 0 ? 1 : -1);
      if (next < 0 || next >= SWIPE_TABS.length) return;

      location.hash = `#/${SWIPE_TABS[next]}`;
    },
    { passive: true },
  );
}

installSwipeNavigation();

async function boot(): Promise<void> {
  document.documentElement.style.setProperty(
    "--sheet-size",
    `${loadSheetSize()}px`,
  );

  fill(root as HTMLElement, shell.shell);

  try {
    await store.init();
  } catch (error) {
    fill(
      shell.main,
      h(
        "div",
        { class: "empty" },
        h("p", { class: "empty__title" }, "Storage unavailable"),
        h(
          "p",
          {},
          "This app needs IndexedDB to remember your songs. Private browsing modes sometimes block it.",
        ),
        h("p", {
          class: "hint",
          text: error instanceof Error ? error.message : String(error),
        }),
      ),
    );
    return;
  }

  if (!location.hash) location.replace("#/home");
  render();
}

void boot();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Offline support is an enhancement; the app works without it.
    });
  });
}
