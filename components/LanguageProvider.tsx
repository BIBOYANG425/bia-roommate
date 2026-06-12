"use client";

// Single app-wide source of truth for the UI language. Replaces the two
// parallel systems that existed before: the marketing pages' local
// `useState<Lang>` and ProductShell's own `ProductLanguage` state. Both now
// read/write this provider, so a visitor's choice is shared and persisted
// across marketing, product, and auth surfaces.
//
// AuthModal falls back to this context when no explicit `language` prop is
// passed, which is what fixes the "English modal in 中文 mode" bug at every
// call site without prop-drilling.

import { createContext, useContext, useState, type ReactNode } from "react";

export type Language = "en" | "zh";

// Shared with the legacy ProductShell key so existing stored preferences
// carry over seamlessly.
const LANGUAGE_STORAGE_KEY = "bia-product-language";

// App-wide default when the visitor has no stored preference. The site is a
// zh-first community (see <html lang="zh-CN">), so we default to Chinese.
// Change this one constant to flip the default everywhere.
const DEFAULT_LANGUAGE: Language = "zh";

export function resolveInitialLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en") return "en";
    if (stored === "zh") return "zh";
    return DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function writeStoredLanguage(language: Language) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage can fail in private mode or restricted browser contexts.
  }
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    resolveInitialLanguage,
  );

  function setLanguage(next: Language) {
    setLanguageState(next);
    writeStoredLanguage(next);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
