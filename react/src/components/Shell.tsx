import React from "react";
import { Icon } from "./Icon.js";

const TABS = [
  { route: "home", label: "Home", iconName: "home" },
  { route: "library", label: "Library", iconName: "library" },
  { route: "instruments", label: "Instruments", iconName: "instruments" },
  { route: "settings", label: "Settings", iconName: "settings" },
];

export interface ShellProps {
  currentRoute: string;
  children: React.ReactNode;
}

export function Shell({ currentRoute, children }: ShellProps) {
  const activeTab = currentRoute === "song" ? "library" : currentRoute;

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead__inner">
          <a className="wordmark" href="#/home">
            Song<b>Unlocked</b>
          </a>
          <nav className="nav" aria-label="Primary">
            {TABS.map((tab) => {
              const isActive = tab.route === activeTab;
              return (
                <a
                  key={tab.route}
                  className="nav__item"
                  href={`#/${tab.route}`}
                  data-route={tab.route}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon name={tab.iconName} size={22} />
                  <span>{tab.label}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="main" id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
