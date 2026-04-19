/**
 * Merge substring + semantic search results into a single ranked list.
 * Pure, easy to unit-test, easy to demo:
 *   substring contains query  → +1.0
 *   exact filename match      → +2.0 (additive on top of +1.0)
 *   semantic top-N            → +similarity (0..1)
 * Top-50, deduped by key, sorted descending.
 */

export interface RankerSubstring {
  key: string;
  name: string;
}

export interface RankerSemantic {
  key: string;
  score: number;
}

export interface MergedResult {
  key: string;
  score: number;
  fromSubstring: boolean;
  fromSemantic: boolean;
}

const TOP_N = 50;

export function mergeResults(
  substring: RankerSubstring[],
  semantic: RankerSemantic[],
  query: string
): MergedResult[] {
  const q = query.toLowerCase();
  const map = new Map<string, MergedResult>();

  for (const s of substring) {
    const lower = s.name.toLowerCase();
    let score = 0;
    if (lower.includes(q)) score += 1.0;
    if (lower === q) score += 2.0;
    if (score === 0) continue;
    map.set(s.key, { key: s.key, score, fromSubstring: true, fromSemantic: false });
  }

  for (const s of semantic) {
    const existing = map.get(s.key);
    if (existing) {
      existing.score += s.score;
      existing.fromSemantic = true;
    } else {
      map.set(s.key, { key: s.key, score: s.score, fromSubstring: false, fromSemantic: true });
    }
  }

  return [...map.values()].sort((a, b) => b.score - a.score).slice(0, TOP_N);
}
