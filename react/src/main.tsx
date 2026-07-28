import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";

const rootEl = document.getElementById("app");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
