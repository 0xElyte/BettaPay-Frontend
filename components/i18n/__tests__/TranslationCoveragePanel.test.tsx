import { fireEvent, render, screen } from "@testing-library/react";
import { createInstance, type i18n as I18nType } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";

import { TranslationCoveragePanel } from "../TranslationCoveragePanel";

async function makeInstance(lng: string) {
  const instance = createInstance();
  await instance.use(initReactI18next).init({
    lng,
    fallbackLng: "en",
    ns: ["translation"],
    defaultNS: "translation",
    resources: {
      en: { translation: { common: { brand: "BettaPay", tagline: "Pay globally" } } },
      // `fr` is intentionally missing `common.tagline`.
      fr: { translation: { common: { brand: "BettaPay" } } },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

function renderPanel(instance: I18nType) {
  return render(
    <I18nextProvider i18n={instance}>
      <TranslationCoveragePanel />
    </I18nextProvider>,
  );
}

describe("TranslationCoveragePanel (dev-only)", () => {
  it("reveals keys missing from the active locale with the English fallback", async () => {
    const instance = await makeInstance("fr");
    renderPanel(instance);

    // Open the panel, then assert on its contents.
    fireEvent.click(screen.getByRole("button", { name: /i18n/i }));

    expect(screen.getByTestId("i18n-missing-count")).toHaveTextContent("1 missing");
    const missing = screen.getByTestId("i18n-missing-key");
    expect(missing).toHaveTextContent("common.tagline");
    expect(missing).toHaveTextContent("Pay globally");
  });

  it("reports full coverage when the active locale has every key", async () => {
    const instance = await makeInstance("en");
    renderPanel(instance);

    fireEvent.click(screen.getByRole("button", { name: /i18n/i }));

    expect(screen.getByTestId("i18n-missing-count")).toHaveTextContent("0 missing");
    expect(screen.getByText(/All keys translated/i)).toBeInTheDocument();
  });
});
