import React, { useEffect, useState } from "react";
import * as store from "./store.js";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { useSwipeNavigation } from "./hooks/useSwipe.js";
import { ToastProvider } from "./components/ToastContext.js";
import { Shell } from "./components/Shell.js";
import { HomeView } from "./views/HomeView.js";
import { LibraryView } from "./views/LibraryView.js";
import { SongView } from "./views/SongView.js";
import { InstrumentsView } from "./views/InstrumentsView.js";
import { SettingsView } from "./views/SettingsView.js";

export function AppContent() {
  const { route, param, navigate } = useHashRoute();
  const [storeReady, setStoreReady] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  useSwipeNavigation();

  useEffect(() => {
    store
      .init()
      .then(() => setStoreReady(true))
      .catch((err) => {
        setStoreError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  if (storeError) {
    return (
      <div className="empty">
        <p className="empty__title">Storage unavailable</p>
        <p>
          This app needs IndexedDB to remember your songs. Private browsing modes sometimes block it.
        </p>
        <p className="hint">{storeError}</p>
      </div>
    );
  }

  if (!storeReady) {
    return null;
  }

  let content: React.ReactNode;

  switch (route) {
    case "library":
      content = <LibraryView />;
      break;
    case "song":
      content = <SongView songId={param} navigate={navigate} />;
      break;
    case "instruments":
      content = <InstrumentsView />;
      break;
    case "settings":
      content = <SettingsView />;
      break;
    case "home":
      content = <HomeView />;
      break;
    default:
      content = (
        <div className="empty">
          <p className="empty__title">Nothing here</p>
          <a className="btn" href="#/home">
            Go home
          </a>
        </div>
      );
  }

  return <Shell currentRoute={route}>{content}</Shell>;
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
