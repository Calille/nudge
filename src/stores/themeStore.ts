import { create } from "zustand";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "nudgemail.theme";

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // localStorage may be disabled — fall through.
  }
  return "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(choice: ThemeChoice): "light" | "dark" {
  return choice === "system" ? (systemPrefersDark() ? "dark" : "light") : choice;
}

// Apply to <html> immediately so the first paint matches the user's
// preference (no flash of wrong theme). Safe to call repeatedly.
function apply(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

interface ThemeState {
  choice: ThemeChoice;
  resolved: "light" | "dark";
  setChoice: (next: ThemeChoice) => void;
  // Called once from App on mount to wire the system-preference listener.
  initSystemListener: () => () => void;
}

// Compute the initial state synchronously so the very first render uses
// the right theme. We also apply the class to <html> at module load time
// for the same reason — the store import happens before the React tree
// hydrates.
const initialChoice = readChoice();
const initialResolved = resolve(initialChoice);
if (typeof document !== "undefined") apply(initialResolved);

export const useThemeStore = create<ThemeState>((set, get) => ({
  choice: initialChoice,
  resolved: initialResolved,

  setChoice: (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting is best-effort — choice still applies for this session.
    }
    const resolved = resolve(next);
    apply(resolved);
    set({ choice: next, resolved });
  },

  initSystemListener: () => {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (get().choice !== "system") return;
      const resolved: "light" | "dark" = mq.matches ? "dark" : "light";
      apply(resolved);
      set({ resolved });
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  },
}));
