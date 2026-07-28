# SongUnlocked

*Organize your music practice.*

SongUnlocked is a personal song library for keeping the music you want to learn in one place. Save songs, organize practice details, follow chord sheets, and track what you have mastered without creating an account.

The repository contains two equal implementations of the same product experience: one built with Vanilla TypeScript and one built with React.

## Preview

> Screenshots coming soon.

## Features

- Build a personal library of songs.
- Track songs as **To Learn** or **Mastered**.
- Save the artist, instrument, capo position, chord sheet, and mood tags for each song.
- Search the library and filter it by instrument, status, capo, or mood.
- Use colored mood presets with a distinct icon for each mood.
- Read chord sheets with adjustable text size.
- Start autoscroll and control its speed while practicing.
- Add and manage custom instruments.
- Export the library as a backup and import it again later.
- Navigate comfortably on mobile, including swipe navigation between primary tabs.
- Keep practicing offline after the production app has been cached.

## Choose an implementation

Both implementations provide the same SongUnlocked experience and use separate local storage, so they can be run side by side.

| Implementation | Description | Local development |
| --- | --- | --- |
| [Vanilla](./vanilla/) | TypeScript with browser APIs and lightweight UI modules. | `http://localhost:5173/` |
| [React](./react/) | React 18 and TypeScript with reusable components and hooks. | `http://localhost:5174/` |

Neither implementation requires a backend or user account.

## Quick start

### Requirements

- Node.js
- npm

### Run the Vanilla implementation

```bash
cd vanilla
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/).

### Run the React implementation

```bash
cd react
npm install
npm run dev
```

Open [http://localhost:5174/](http://localhost:5174/).

### Create a production build

From the repository root:

```bash
npm install
npm run build:vanilla
npm run build:react
```

The generated files are written to `vanilla/dist/` and `react/dist/`.

## Technology

### Shared foundation

- TypeScript
- Vite
- IndexedDB for the song and instrument library
- Local storage for interface preferences
- Progressive Web App support
- Service-worker caching for offline use
- Custom hash-based navigation

### Vanilla

- Browser DOM APIs
- Small TypeScript UI modules
- No runtime UI framework

### React

- React 18
- React DOM
- Components and custom hooks
- `useSyncExternalStore` for store subscriptions

## Repository structure

```text
.
├── vanilla/          # Vanilla TypeScript implementation
├── react/            # React implementation
├── scripts/          # Shared repository checks and build inspection
└── package.json      # Commands shared across both packages
```

Each implementation contains its own application source, public assets, tests, and production configuration.

## Data and privacy

SongUnlocked stores the library locally in the browser. Songs, instruments, filters, and reading preferences are not sent to a SongUnlocked server.

The Vanilla and React implementations use separate storage namespaces. Changes made in one implementation do not automatically appear in the other.

Use the export and import tools in **Settings** when moving a library between browsers, devices, or implementations.

Clearing browser storage can remove local data, so keep an exported backup of anything important.

## Offline use

Production builds include a service worker that caches the application files required to open SongUnlocked offline.

Open the production app online once so its files can be cached. The local song library remains stored in the browser and can then be used without a network connection.
