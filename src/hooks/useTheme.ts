import { useEffect, useRef, useState } from "react";
import { darkTheme, lightTheme } from "@/theme.css";

export type Theme = "dark" | "light";

const THEME_CLASSES: Record<Theme, string> = {
  dark: darkTheme,
  light: lightTheme,
};

function getStoredTheme(): Theme {
  const stored = localStorage.getItem("theme");
  return stored === "light" ? "light" : "dark";
}

function applyThemeClass(theme: Theme) {
  const add = THEME_CLASSES[theme];
  const remove = THEME_CLASSES[theme === "dark" ? "light" : "dark"];
  document.documentElement.classList.remove(remove);
  document.documentElement.classList.add(add);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const isExternalUpdate = useRef(false);
  const hasMounted = useRef(false);

  // Apply class + emit to all windows + OS theme sync whenever theme changes
  useEffect(() => {
    applyThemeClass(theme);

    if (hasMounted.current && !isExternalUpdate.current) {
      // emitTo("*") broadcasts to ALL windows; plain emit() only reaches the current window
      import("@tauri-apps/api/event")
        .then(({ emitTo }) => emitTo("*", "theme-changed", theme))
        .catch(() => {});
    }
    // reset here (not in listener) so the flag is cleared after React re-renders due to the state change
    isExternalUpdate.current = false;
    hasMounted.current = true;

    import("@tauri-apps/api/app")
      .then(({ setTheme }) => setTheme(theme))
      .catch(() => {});
  }, [theme]);

  // Re-sync from localStorage whenever this window becomes visible (e.g. shown via global hotkey).
  // This is the primary sync path for the main window; Tauri events are the secondary path.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const stored = getStoredTheme();
        applyThemeClass(stored);
        setThemeState(stored);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Listen for theme changes from OTHER windows (runs once on mount)
  useEffect(() => {
    let isMounted = true;
    let unlisten: (() => void) | null = null;

    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<Theme>("theme-changed", (event) => {
          const incoming = event.payload === "light" ? "light" : "dark";
          isExternalUpdate.current = true;
          applyThemeClass(incoming);
          setThemeState(incoming);
          localStorage.setItem("theme", incoming);
        })
      )
      .then((fn) => {
        if (!isMounted) {
          fn(); // already unmounted — immediately unlisten
          return;
        }
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  return { theme, setTheme };
}
