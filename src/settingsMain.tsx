import React from "react";
import ReactDOM from "react-dom/client";
import { SettingsApp } from "@/components/Settings";
import "./settings.css";

document.addEventListener("contextmenu", (e) => e.preventDefault());

// SettingsApp calls useTheme() internally — no wrapper needed here.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
);
