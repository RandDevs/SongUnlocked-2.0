/**
 * Autoscroll engine.
 *
 * Scrolls the page at a constant speed in pixels per second, independent of
 * frame rate, so a slow device scrolls at the same musical pace as a fast one.
 * Sub-pixel movement is accumulated rather than rounded away — without that,
 * slow speeds would never advance at all.
 */

export const MIN_SPEED = 8;
export const MAX_SPEED = 120;
export const DEFAULT_SPEED = 32;

const SPEED_KEY = "songunlocked:scroll-speed";

export function loadSpeed(): number {
  const stored = Number(localStorage.getItem(SPEED_KEY));
  if (!Number.isFinite(stored) || stored <= 0) return DEFAULT_SPEED;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, stored));
}

export function saveSpeed(speed: number): void {
  localStorage.setItem(SPEED_KEY, String(speed));
}

export function createAutoscroll(
  options: { onStateChange?: (playing: boolean) => void } = {},
) {
  let speed = loadSpeed();
  let playing = false;
  let frame = 0;
  let lastTime = 0;
  let carry = 0;

  function emit(): void {
    options.onStateChange?.(playing);
  }

  function step(time: number): void {
    if (!playing) return;

    if (lastTime === 0) lastTime = time;
    // Clamp the delta so returning from a background tab does not jump.
    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    carry += speed * delta;
    const whole = Math.floor(carry);

    if (whole >= 1) {
      carry -= whole;
      const before = window.scrollY;
      window.scrollBy(0, whole);

      // Nothing moved: we are at the bottom of the page, so stop cleanly.
      if (window.scrollY === before) {
        stop();
        return;
      }
    }

    frame = requestAnimationFrame(step);
  }

  function play(): void {
    if (playing) return;
    playing = true;
    lastTime = 0;
    carry = 0;
    frame = requestAnimationFrame(step);
    emit();
  }

  function stop(): void {
    if (!playing) {
      cancelAnimationFrame(frame);
      return;
    }
    playing = false;
    cancelAnimationFrame(frame);
    frame = 0;
    emit();
  }

  return {
    play,
    stop,
    toggle() {
      if (playing) stop();
      else play();
    },
    isPlaying: () => playing,
    getSpeed: () => speed,
    setSpeed(value: number): number {
      speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round(value)));
      saveSpeed(speed);
      return speed;
    },
    /** Release everything. Called whenever the route changes. */
    destroy() {
      playing = false;
      cancelAnimationFrame(frame);
      frame = 0;
      options.onStateChange = undefined;
    },
  };
}
