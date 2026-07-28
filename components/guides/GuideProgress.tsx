"use client";

import { useEffect, useState } from "react";
import { slugify } from "@/components/guides/prose";

const STORAGE_PREFIX = "bettapay:guide-progress:";

/** Read the persisted set of section ids the user has already reached. */
function loadReadSections(slug: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + slug);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function saveReadSections(slug: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(ids));
  } catch {
    // localStorage may be unavailable (private mode, quota) — progress simply
    // won't persist across reloads.
  }
}

/**
 * Fixed reading-progress bar pinned to the top of the viewport. Tracks which
 * H2 sections inside `containerId` the user has scrolled past and shows the
 * completion percentage of all sections. Progress is persisted to localStorage
 * keyed by the guide's slug, so it survives reloads and return visits. Falls
 * back to plain scroll progress when the guide has no sections.
 */
export default function GuideProgress({
  slug,
  containerId,
}: {
  slug: string;
  containerId: string;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = document.getElementById(containerId);
    const headings = container
      ? Array.from(container.querySelectorAll<HTMLHeadingElement>("h2"))
      : [];
    headings.forEach((heading) => {
      if (!heading.id) heading.id = slugify(heading.textContent?.trim() ?? "");
    });
    const sectionIds = new Set(headings.map((heading) => heading.id));
    const read = new Set(
      loadReadSections(slug).filter((id) => sectionIds.has(id))
    );

    const update = () => {
      if (headings.length === 0) {
        const scrollTop = window.scrollY;
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        setProgress(Math.min(100, Math.max(0, pct)));
        return;
      }

      // A section counts as read once its heading crosses the middle of the
      // viewport, or when the user reaches the bottom of the page.
      const threshold = window.innerHeight * 0.5;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      let changed = false;
      headings.forEach((heading) => {
        if (read.has(heading.id)) return;
        if (atBottom || heading.getBoundingClientRect().top <= threshold) {
          read.add(heading.id);
          changed = true;
        }
      });
      if (changed) saveReadSections(slug, Array.from(read));
      setProgress((read.size / headings.length) * 100);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [slug, containerId]);

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-primary transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
