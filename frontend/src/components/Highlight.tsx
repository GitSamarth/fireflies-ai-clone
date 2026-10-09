import { Fragment } from "react";

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Counts case-insensitive, non-overlapping occurrences of `term` in `text`. */
export function countMatches(text: string, term: string): number {
  if (!term) return 0;
  return text.match(new RegExp(escapeRegExp(term), "gi"))?.length ?? 0;
}

/**
 * Renders text with <mark> around matches. `firstOccurrence` is the global index of this
 * text's first match so the "current" match (global index) can be styled differently.
 */
export default function Highlight({ text, term, firstOccurrence = 0, currentOccurrence = -1 }:
  { text: string; term: string; firstOccurrence?: number; currentOccurrence?: number }) {
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, "gi"));
  let occ = firstOccurrence;
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={occ === currentOccurrence ? "current" : undefined} data-occ={occ++}>{p}</mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ))}
    </>
  );
}
