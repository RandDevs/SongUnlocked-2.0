import React from "react";

const SHAPES: Record<string, { d: string[]; fill?: boolean }> = {
  home: { d: ["M3 10.75 12 3.5l9 7.25", "M5.5 9.6V20.5h13V9.6"] },
  library: { d: ["M4 6.5h12", "M4 12h12", "M4 17.5h7", "M19 15.5v-9"] },
  instruments: { d: ["M8 3v7a4 4 0 0 0 8 0V3", "M12 14v7"] },
  settings: {
    d: [
      "M4 8h8",
      "M17 8h3",
      "M4 16h3",
      "M12 16h8",
      "M16.5 8a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
      "M11.5 16a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
    ],
  },
  search: {
    d: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m16.3 16.3 4.2 4.2"],
  },
  play: { d: ["M8 5.2v13.6L19 12z"], fill: true },
  pause: { d: ["M9 5h2.4v14H9z", "M12.6 5H15v14h-2.4z"], fill: true },
  plus: { d: ["M12 5.5v13", "M5.5 12h13"] },
  check: { d: ["m5 12.5 4.5 4.5L19 7"] },
  pencil: { d: ["M4 20h4L20 8l-4-4L4 16z", "M14.5 5.5 18.5 9.5"] },
  trash: { d: ["M4 7h16", "M9.5 7V4h5v3", "M6 7l1 13h10l1-13"] },
  archive: { d: ["M3.5 7h17v4h-17z", "M5.5 11v9.5h13V11", "M10 15h4"] },
  restore: { d: ["M4 12a8 8 0 1 0 8-8", "m4 5v7h7"] },
  download: { d: ["M12 4v11", "m7 11 5 5 5-5", "M4.5 20h15"] },
  upload: { d: ["M12 20V9", "m7 13 5-5 5 5", "M4.5 4h15"] },
  chevronLeft: { d: ["m14.5 6-6 6 6 6"] },
  chevronDown: { d: ["m6 9.5 6 6 6-6"] },
  close: { d: ["m6 6 12 12", "M18 6 6 18"] },
  unlock: { d: ["M6.5 11h11v9.5h-11z", "M9 11V8.2A3 3 0 0 1 15 8.2"] },
  filter: { d: ["M4 6.5h16", "M7 12h10", "M10.5 17.5h3"] },

  moodSad: {
    d: [
      "M12 3.6c3.2 4.1 5.4 6.9 5.4 9.6a5.4 5.4 0 1 1-10.8 0c0-2.7 2.2-5.5 5.4-9.6Z",
    ],
  },
  moodLove: {
    d: [
      "M12 20.3C12 20.3 3.8 15.4 3.8 9.6a4.3 4.3 0 0 1 8.2-1.9 4.3 4.3 0 0 1 8.2 1.9c0 5.8-8.2 10.7-8.2 10.7Z",
    ],
  },
  moodHappy: {
    d: [
      "M12 16.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z",
      "M12 2.6v2.3",
      "M12 19.1v2.3",
      "M2.6 12h2.3",
      "M19.1 12h2.3",
      "m5.4 5.4 1.6 1.6",
      "m17 17 1.6 1.6",
      "m18.6 5.4-1.6 1.6",
      "m7 17-1.6 1.6",
    ],
  },
  moodNostalgic: {
    d: [
      "M3.5 6.5h17v11h-17z",
      "M8.4 12.9a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z",
      "M15.6 12.9a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z",
      "M8.4 15.4h7.2",
    ],
  },
  moodChill: {
    d: ["M20.2 14.7A8.5 8.5 0 0 1 9.3 3.8a8.5 8.5 0 1 0 10.9 10.9Z"],
  },
  moodUpbeat: { d: ["M13.6 2.8 5.6 13.4h5.2L10.4 21.2l8-10.6h-5.3z"] },
  moodCampfire: {
    d: [
      "M12 20.6c3.1 0 5.1-2 5.1-4.7 0-3.8-3.9-5-3-9.7-2.4.9-4 3.1-4 5.1 0 1.2.5 1.9.5 2.5 0 .8-.6 1.4-1.4 1.4-.8 0-1.4-.6-1.4-1.9-.9.9-1.1 2.2-1.1 3.1 0 2.4 2 4.2 5.3 4.2Z",
    ],
  },
};

export interface IconProps {
  name: string;
  size?: number;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 20, style }: IconProps) {
  const shape = SHAPES[name];
  if (!shape) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        style={style}
      />
    );
  }

  const strokeProps = shape.fill
    ? { fill: "currentColor", stroke: "none" }
    : {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.6",
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
      };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={style}
      {...strokeProps}
    >
      {shape.d.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
