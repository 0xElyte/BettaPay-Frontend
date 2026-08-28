/**
 * Tiny client-side fuzzy matcher for the command palette (issue #459).
 *
 * Scores a candidate string against a query: every query character must
 * appear in order; consecutive matches and matches at word boundaries score
 * higher. Returns `null` when the query doesn't match at all.
 */
export interface FuzzyMatch {
  score: number;
  /** Indices in the candidate that matched, for highlighting. */
  indices: number[];
}

export function fuzzyMatch(query: string, candidate: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase();
  if (q === "") return { score: 0, indices: [] };

  const text = candidate.toLowerCase();
  const indices: number[] = [];
  let score = 0;
  let qi = 0;
  let prevMatch = -2;

  for (let ti = 0; ti < text.length && qi < q.length; ti++) {
    if (text[ti] !== q[qi]) continue;
    indices.push(ti);
    // Consecutive match.
    if (ti === prevMatch + 1) score += 6;
    else score += 1;
    // Word-boundary bonus (start of string, or after a separator).
    if (ti === 0 || /[\s/\-_.]/.test(text[ti - 1] ?? "")) score += 8;
    prevMatch = ti;
    qi++;
  }

  if (qi < q.length) return null;

  // Prefer shorter candidates and earlier first-match.
  score += Math.max(0, 12 - (indices[0] ?? 0));
  score -= Math.floor(text.length / 12);
  return { score, indices };
}

export interface Scored<T> {
  item: T;
  score: number;
  indices: number[];
}

/**
 * Ranks `items` by the best fuzzy match of `query` against any of the strings
 * `keyOf` returns. With an empty query, returns every item in original order
 * (score 0) so callers can layer their own ordering (e.g. recents first).
 */
export function fuzzyRank<T>(
  query: string,
  items: readonly T[],
  keyOf: (item: T) => string[],
): Scored<T>[] {
  const q = query.trim();
  const out: Scored<T>[] = [];

  for (const item of items) {
    if (q === "") {
      out.push({ item, score: 0, indices: [] });
      continue;
    }
    let best: FuzzyMatch | null = null;
    for (const key of keyOf(item)) {
      const m = fuzzyMatch(q, key);
      if (m && (!best || m.score > best.score)) best = m;
    }
    if (best) out.push({ item, score: best.score, indices: best.indices });
  }

  if (q !== "") out.sort((a, b) => b.score - a.score);
  return out;
}
