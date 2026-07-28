import { useState, useEffect, useCallback } from "react";

export interface ParsedRoute {
  route: string;
  param: string;
}

export function parseRoute(): ParsedRoute {
  const raw = location.hash.replace(/^#\/?/, "");
  const [route, param] = raw.split("/");
  return { route: route || "home", param: param || "" };
}

export function useHashRoute() {
  const [routeInfo, setRouteInfo] = useState<ParsedRoute>(parseRoute);

  useEffect(() => {
    function handleHashChange() {
      setRouteInfo(parseRoute());
      window.scrollTo(0, 0);
    }

    window.addEventListener("hashchange", handleHashChange);
    if (!location.hash) {
      location.replace("#/home");
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const navigate = useCallback((targetHash: string) => {
    if (location.hash === targetHash) {
      setRouteInfo(parseRoute());
    } else {
      location.hash = targetHash;
    }
  }, []);

  return { ...routeInfo, navigate };
}
