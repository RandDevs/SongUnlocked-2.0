import { useEffect } from "react";
import { parseRoute } from "./useHashRoute.js";

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

export function useSwipeNavigation() {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    function handleTouchStart(event: TouchEvent) {
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
    }

    function handleTouchEnd(event: TouchEvent) {
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
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);
}
