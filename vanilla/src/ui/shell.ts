/**
 * Persistent chrome: masthead, navigation, toast host.
 *
 * Built once at boot and never re-created, so navigating between screens only
 * swaps the contents of <main>.
 */

import { h } from "../dom.js";
import { icon } from "../icons.js";

const TABS = [
  { route: "home", label: "Home", iconName: "home" },
  { route: "library", label: "Library", iconName: "library" },
  { route: "instruments", label: "Instruments", iconName: "instruments" },
  { route: "settings", label: "Settings", iconName: "settings" },
];

export function buildShell() {
  const tabLinks: HTMLAnchorElement[] = [];

  const nav = h(
    "nav",
    { class: "nav", "aria-label": "Primary" },
    TABS.map((tab) => {
      const link = h(
        "a",
        {
          class: "nav__item",
          href: `#/${tab.route}`,
          dataset: { route: tab.route },
        },
        icon(tab.iconName, 22),
        h("span", { text: tab.label }),
      ) as HTMLAnchorElement;
      tabLinks.push(link);
      return link;
    }),
  );

  const main = h("main", { class: "main", id: "main", tabindex: "-1" });
  const toasts = h("div", {
    class: "toasts",
    role: "status",
    "aria-live": "polite",
  });

  const shell = h(
    "div",
    { class: "app" },
    h(
      "header",
      { class: "masthead" },
      h(
        "div",
        { class: "masthead__inner" },
        h(
          "a",
          { class: "wordmark", href: "#/home" },
          "Song",
          h("b", {}, "Unlocked"),
        ),
        nav,
      ),
    ),
    main,
    toasts,
  );

  return {
    shell,
    main,

    setActiveTab(route: string) {
      for (const link of tabLinks) {
        const isActive = link.dataset.route === route;
        if (isActive) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
    },

    toast(message: string, options: { error?: boolean } = {}) {
      const node = h("div", {
        class: `toast ${options.error ? "toast--error" : ""}`,
        text: message,
      });
      toasts.appendChild(node);
      setTimeout(() => node.remove(), options.error ? 5200 : 3200);
    },
  };
}
