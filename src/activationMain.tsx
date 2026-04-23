import React from "react";
import ReactDOM from "react-dom/client";
import { LicenseActivation } from "@/components/LicenseActivation";
import { useTheme } from "@/hooks/useTheme";
import "./settings.css";

document.addEventListener("contextmenu", (e) => e.preventDefault());

export function ActivationApp() {
  useTheme();
  return <LicenseActivation />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ActivationApp />
  </React.StrictMode>
);
