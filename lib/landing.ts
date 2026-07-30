/**
 * Landing page feature definitions.
 *
 * Marketing team members can add, remove, or reorder features here
 * without touching React code. Each entry maps to an i18n key under
 * `landing.features.<key>` for the title and description.
 *
 * Supported icon names correspond to exports from the `lucide-react`
 * package. See https://lucide.dev/icons for the full catalogue.
 */

export type LandingFeature = {
  /** Lucide icon name (must match a named export from `lucide-react`). */
  iconName: string;
  /** i18n key suffix used under `landing.features.<key>.title` / `.description`. */
  titleKey: string;
  /** i18n key suffix used under `landing.features.<key>.description`. */
  descriptionKey: string;
  /** Optional link target (e.g. "/docs/settlement"). */
  link?: string;
};

/**
 * Ordered list of features shown in the landing page features section.
 *
 * To add a new feature:
 * 1. Add a new entry to this array with a unique `titleKey`.
 * 2. Add the corresponding `landing.features.<titleKey>.title` and
 *    `landing.features.<titleKey>.description` entries to each
 *    locale file under `lib/i18n/`.
 * 3. The landing page will pick it up automatically.
 */
export const landingFeatures: LandingFeature[] = [
  {
    iconName: "Zap",
    titleKey: "settlement",
    descriptionKey: "settlement",
    link: "/docs",
  },
  {
    iconName: "Globe",
    titleKey: "offRamps",
    descriptionKey: "offRamps",
    link: "/fiat-settlements",
  },
  {
    iconName: "Coins",
    titleKey: "fees",
    descriptionKey: "fees",
  },
];
