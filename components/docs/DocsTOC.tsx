"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useScrollSpy } from '@/lib/hooks/useScrollSpy';

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface DocsTOCProps {
  /** Currently-active top-level section id (from the scroll spy). */
  activeSection: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Right-hand mini table of contents (desktop ≥ xl only). Shows the H2/H3
 * headings inside the currently-active section and highlights the heading the
 * reader is on, using its own scroll spy over those heading ids.
 */
export function DocsTOC({ activeSection }: DocsTOCProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const initialScrollDone = useRef(false);

  // Re-scan headings and assign unique IDs whenever the active section changes
  useEffect(() => {
    // 1. Generate unique, stable IDs for all headings on the page first
    const allHeadings = Array.from(
      document.querySelectorAll<HTMLElement>('#main-content h2[id], #main-content h3[id]'),
    );
    allHeadings.forEach((node, index) => {
      const text = node.textContent?.trim() ?? '';
      const slug = slugify(text);
      node.id = `${slug}-${index}`;
    });

    // 2. Handle deep link navigation on initial load after IDs are assigned
    if (!initialScrollDone.current) {
      const hash = window.location.hash;
      if (hash) {
        const targetId = hash.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          initialScrollDone.current = true;
          setTimeout(() => {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } else {
        initialScrollDone.current = true;
      }
    }

    // 3. Scan the active section's sub-headings using the updated unique IDs
    const section = document.getElementById(activeSection);
    if (!section) {
      setHeadings([]);
      return;
    }
    const nodes = Array.from(
      section.querySelectorAll<HTMLElement>('h2[id], h3[id]'),
    );
    setHeadings(
      nodes.map((node) => ({
        id: node.id,
        text: node.textContent ?? '',
        level: node.tagName === 'H2' ? 2 : 3,
      })),
    );
  }, [activeSection]);

  const headingIds = useMemo(() => headings.map((h) => h.id), [headings]);
  const activeHeading = useScrollSpy(headingIds, { rootMargin: '0px 0px -75% 0px' });

  // Always reserve the column so the content width doesn't jump between sections.
  if (headings.length === 0) {
    return <div className="hidden w-56 shrink-0 xl:block" aria-hidden="true" />;
  }

  return (
    <aside className="hidden w-56 shrink-0 xl:block">
      <nav
        aria-labelledby="docs-toc-heading"
        className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-8"
      >
        <p
          id="docs-toc-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          On this page
        </p>
        <ul className="space-y-1 border-l border-border">
          {headings.map((heading) => {
            const active = heading.id === activeHeading;
            return (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  className={cn(
                    '-ml-px block border-l-2 py-1 pl-3 text-sm transition-colors',
                    heading.level === 3 && 'pl-6',
                    active
                      ? 'border-primary font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
