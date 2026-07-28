"use client";

import { ReactNode, useEffect, useState } from "react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

import { defaultLocale, detectPreferredLocale, fallbackResources } from "@/lib/i18n/config";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [i18n] = useState(() => {
    const instance = createInstance();
    void instance
      .use(HttpBackend)
      .use(initReactI18next)
      .init({
        fallbackLng: defaultLocale,
        supportedLngs: ["en", "fr", "pt", "sw"],
        ns: ["translation"],
        defaultNS: "translation",
        backend: {
          loadPath: "/locales/{{lng}}/{{ns}}.json",
          crossOrigin: true,
        },
        resources: fallbackResources,
        interpolation: { escapeValue: false },
        initAsync: false,
        react: { useSuspense: false },
      });
    return instance;
  });

  useEffect(() => {
    const preferredLocale = detectPreferredLocale();
    void i18n.changeLanguage(preferredLocale);
    document.documentElement.lang = preferredLocale;
  }, [i18n]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
