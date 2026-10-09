"""Transcript import: .txt / .vtt / .json / pasted text -> normalized segments.

Segments without timestamps get synthetic timing from word count (~2.6 words/s),
so pasted plain text still produces a usable seekable transcript.
"""
import json
import re

WORDS_PER_SEC = 2.6
PAUSE_MS = 600
MIN_SEG_MS = 1000

_TS = r"(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?"
_NAME = r"[^\[\]():<>\n]{1,60}?"
# "[00:12] Alice: hi"  /  "00:12 Alice: hi"
_RE_TS_FIRST = re.compile(rf"^\[?({_TS})\]?\s*[-–]?\s*({_NAME}):\s*(.+)$")
# "Alice [00:12]: hi" / "Alice (00:12): hi" / "Alice 00:12: hi"
_RE_NAME_FIRST_TS = re.compile(rf"^({_NAME})\s*[\[(]?({_TS})[\])]?:?\s+(.+)$")
# "Alice: hi"
_RE_PLAIN = re.compile(rf"^({_NAME}):\s*(.+)$")
_RE_VTT_TIME = re.compile(rf"({_TS})\s*-->\s*({_TS})")
_RE_VTT_V = re.compile(r"^<v(?:\.\w+)*\s+([^>]+)>(.*?)(?:</v>)?$")


def parse_ts(s: str) -> int:
    s = s.replace(",", ".")
    parts = s.split(":")
    secs = 0.0
    for p in parts:
        secs = secs * 60 + float(p)
    return int(round(secs * 1000))


def _est_ms(text: str) -> int:
    return max(MIN_SEG_MS, int(len(text.split()) / WORDS_PER_SEC * 1000))


def finalize_segments(raw: list[dict]) -> list[dict]:
    """raw items: speaker, text, start_ms|None, end_ms|None -> gap-free ordered segments."""
    raw = [r for r in raw if r["text"].strip()]
    if not raw:
        raise ValueError("No transcript lines could be parsed")
    out, cursor = [], 0
    for i, r in enumerate(raw):
        start = r.get("start_ms")
        if start is None:
            start = cursor + (PAUSE_MS if out else 0)
        start = max(start, out[-1]["start_ms"] if out else 0)  # monotonic starts
        end = r.get("end_ms")
        if end is None:
            nxt = raw[i + 1].get("start_ms") if i + 1 < len(raw) else None
            end = nxt if nxt is not None and nxt > start else start + _est_ms(r["text"])
        end = max(end, start + 1)
        out.append({"speaker": r["speaker"].strip()[:120] or "Unknown",
                    "text": r["text"].strip(), "start_ms": start, "end_ms": end})
        cursor = end
    return out


def _parse_json(text: str) -> list[dict]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e.msg}") from e
    if isinstance(data, dict):
        data = data.get("segments") or data.get("transcript") or data.get("sentences")
    if not isinstance(data, list):
        raise ValueError("JSON must be a list of segments or {\"segments\": [...]}")

    def t(item, *keys):
        for k in keys:
            v = item.get(k)
            if v is None:
                continue
            if isinstance(v, str) and ":" in v:
                return parse_ts(v)
            if isinstance(v, bool) or not isinstance(v, (int, float, str)):
                continue
            ms = k.endswith("_ms")
            return int(float(v) * (1 if ms else 1000))
        return None

    raw = []
    for item in data:
        if not isinstance(item, dict):
            raise ValueError("Each JSON segment must be an object")
        txt = item.get("text") or item.get("sentence") or ""
        if not isinstance(txt, str):
            raise ValueError("Segment text must be a string")
        raw.append({
            "speaker": str(item.get("speaker") or item.get("speaker_name") or item.get("name") or "Unknown"),
            "text": txt,
            "start_ms": t(item, "start_ms", "start", "start_time"),
            "end_ms": t(item, "end_ms", "end", "end_time"),
        })
    return finalize_segments(raw)


def _parse_vtt(text: str) -> list[dict]:
    raw = []
    blocks = re.split(r"\n\s*\n", text.replace("\r\n", "\n").strip())
    for block in blocks:
        lines = [l for l in block.split("\n") if l.strip()]
        ti = next((i for i, l in enumerate(lines) if _RE_VTT_TIME.search(l)), None)
        if ti is None:
            continue
        m = _RE_VTT_TIME.search(lines[ti])
        body = " ".join(l.strip() for l in lines[ti + 1:])
        speaker = "Unknown"
        mv = _RE_VTT_V.match(body)
        if mv:
            speaker, body = mv.group(1), mv.group(2)
        else:
            mp = _RE_PLAIN.match(body)
            if mp:
                speaker, body = mp.group(1), mp.group(2)
        body = re.sub(r"</?[^>]+>", "", body)
        raw.append({"speaker": speaker, "text": body,
                    "start_ms": parse_ts(m.group(1)), "end_ms": parse_ts(m.group(2))})
    return finalize_segments(raw)


def _parse_text(text: str) -> list[dict]:
    raw: list[dict] = []
    for line in text.replace("\r\n", "\n").split("\n"):
        line = line.strip()
        if not line:
            continue
        m = _RE_TS_FIRST.match(line)
        if m:
            raw.append({"speaker": m.group(2), "text": m.group(3), "start_ms": parse_ts(m.group(1))})
            continue
        m = _RE_NAME_FIRST_TS.match(line)
        if m:
            raw.append({"speaker": m.group(1), "text": m.group(3), "start_ms": parse_ts(m.group(2))})
            continue
        m = _RE_PLAIN.match(line)
        if m:
            raw.append({"speaker": m.group(1), "text": m.group(2), "start_ms": None})
            continue
        if raw:  # continuation of the previous speaker's turn
            raw[-1]["text"] += " " + line
        else:
            raw.append({"speaker": "Unknown", "text": line, "start_ms": None})
    return finalize_segments(raw)


def parse_transcript(text: str, filename: str | None = None) -> list[dict]:
    text = text.lstrip("\ufeff")
    if not text.strip():
        raise ValueError("Transcript is empty")
    name = (filename or "").lower()
    stripped = text.lstrip()
    if name.endswith(".json"):
        return _parse_json(text)
    if stripped[:1] in ("[", "{"):
        # "[00:12] Alice: hi" also starts with "[": only treat as JSON if it is.
        try:
            json.loads(text)
        except json.JSONDecodeError:
            pass
        else:
            return _parse_json(text)
    if name.endswith(".vtt") or stripped.startswith("WEBVTT"):
        return _parse_vtt(text)
    return _parse_text(text)
