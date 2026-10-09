"""Heuristic stand-in for an LLM summarizer (assignment allows mocked summaries).

Deterministic and dependency-free. Output quality is deliberately modest and is
tagged source="heuristic" so the UI can say so honestly.
"""
import re
from collections import Counter

STOP = set("""a an the and or but if so to of in on at for with from by as is are was were be been being it its this that these
those i you he she we they me him her us them my your our their not no yes do does did done have has had will would can could
should shall may might just also then than there here what which who whom when where why how all any some more most very
really like okay ok yeah right well um uh about into over out up down off too one two get got going go let lets i'll we'll
i'm we're that's it's don't can't think know need want make sure thing things want""".split())

_ACTION = re.compile(
    r"\b(i'll|i will|we'll|we will|let's|i can take|i'll take|need to|needs to|action item|can you|could you|please)\b", re.I)
_SENT = re.compile(r"(?<=[.!?])\s+")


def _tokens(text: str) -> list[str]:
    return [w for w in re.findall(r"[a-zA-Z][a-zA-Z'-]{2,}", text.lower()) if w not in STOP]


def top_keywords(text: str, n: int) -> list[str]:
    return [w for w, _ in Counter(_tokens(text)).most_common(n)]


def summarize(segments: list[dict], duration_ms: int) -> dict:
    full = " ".join(s["text"] for s in segments)
    speakers = list(dict.fromkeys(s["speaker"] for s in segments))
    keywords = top_keywords(full, 6)

    sentences = [x.strip() for x in _SENT.split(full) if len(x.split()) >= 6]
    lead = " ".join(sentences[:2])[:400]
    mins = max(1, round(duration_ms / 60000))
    overview = (f"{len(speakers)} participant{'s' if len(speakers) != 1 else ''} spoke for about {mins} "
                f"minute{'s' if mins != 1 else ''}. Main terms: {', '.join(keywords[:4]) or 'n/a'}. {lead}").strip()

    # chapters: equal-size groups of segments, titled by their most frequent terms
    n = max(1, min(6, round(duration_ms / 180_000) or 1, len(segments)))
    size = -(-len(segments) // n)
    chapters = []
    for i in range(0, len(segments), size):
        grp = segments[i:i + size]
        kws = top_keywords(" ".join(s["text"] for s in grp), 3)
        title = " & ".join(w.capitalize() for w in kws[:2]) or f"Part {len(chapters) + 1}"
        chapters.append({"start_ms": grp[0]["start_ms"], "title": title})

    items, seen = [], set()
    for seg in segments:
        for sent in _SENT.split(seg["text"]):
            sent = sent.strip()
            if 4 <= len(sent.split()) <= 35 and _ACTION.search(sent) and sent.lower() not in seen:
                seen.add(sent.lower())
                mine = re.search(r"\b(i'll|i will|i can take)\b", sent, re.I)
                items.append({"text": sent, "assignee": seg["speaker"] if mine else None})
    items = items[:6]

    notes = []
    for c, nxt in zip(chapters, chapters[1:] + [None]):
        grp = [s for s in segments if s["start_ms"] >= c["start_ms"] and (nxt is None or s["start_ms"] < nxt["start_ms"])]
        first = next((x for s in grp for x in _SENT.split(s["text"]) if len(x.split()) >= 6), None)
        if first:
            notes.append(f"{c['title']}: {first.strip()[:200]}")
    return {"overview": overview, "keywords": keywords, "chapters": chapters, "action_items": items, "notes": notes}
