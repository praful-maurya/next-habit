"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "habit-journal-theme";
const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

function readStoredTheme(): Theme | null {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
  } catch (error) {
    console.error("Unable to read the saved theme preference.", error);
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_MODE_QUERY);
    const syncTheme = (nextTheme: Theme) => {
      applyTheme(nextTheme);
      setTheme(nextTheme);
    };
    const storedTheme = readStoredTheme();

    syncTheme(storedTheme ?? (mediaQuery.matches ? "dark" : "light"));

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (!readStoredTheme()) syncTheme(event.matches ? "dark" : "light");
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        syncTheme(event.newValue === "dark" ? "dark" : event.newValue === "light" ? "light" : mediaQuery.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const switchTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.error("Unable to save the theme preference.", error);
    }
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  const actionLabel = theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";
  const Icon = theme === "dark" ? Moon : Sun;

  return (
    <button
      className="theme-toggle icon-button"
      type="button"
      onClick={switchTheme}
      aria-label={actionLabel}
      aria-pressed={theme === "dark"}
      title={actionLabel}
    >
      <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
