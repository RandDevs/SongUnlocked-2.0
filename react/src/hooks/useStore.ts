import { useSyncExternalStore, useMemo } from "react";
import * as store from "../store.js";

export function useSongs(): store.Song[] {
  const version = useSyncExternalStore(store.subscribe, store.getVersion);
  return useMemo(() => store.getSongs(), [version]);
}

export function useInstruments(): store.Instrument[] {
  const version = useSyncExternalStore(store.subscribe, store.getVersion);
  return useMemo(() => store.getInstruments(), [version]);
}

export function useActiveInstruments(): store.Instrument[] {
  const version = useSyncExternalStore(store.subscribe, store.getVersion);
  return useMemo(() => store.getActiveInstruments(), [version]);
}
