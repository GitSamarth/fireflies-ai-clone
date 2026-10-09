import json

import pytest

from app.parsing import parse_transcript


def test_timestamped_text_bracket_start():
    # regression: leading "[" must not be mistaken for JSON
    segs = parse_transcript("[00:05] Alice: Hello there\n[00:12] Bob: Hi Alice")
    assert [(s["speaker"], s["start_ms"]) for s in segs] == [("Alice", 5000), ("Bob", 12000)]
    assert segs[0]["end_ms"] == 12000  # ends where next begins


def test_name_first_timestamp():
    segs = parse_transcript("Alice [01:05]: Hello\nBob (01:30): Hi")
    assert segs[0]["start_ms"] == 65000 and segs[1]["start_ms"] == 90000


def test_plain_text_gets_synthetic_monotonic_timing():
    segs = parse_transcript("Alice: one two three four five six\nBob: seven eight nine ten")
    assert segs[0]["start_ms"] == 0
    assert segs[1]["start_ms"] > segs[0]["end_ms"] - 1
    assert all(s["end_ms"] > s["start_ms"] for s in segs)


def test_continuation_lines_join_previous_turn():
    segs = parse_transcript("Alice: first part\nsecond part\nBob: reply")
    assert segs[0]["text"] == "first part second part" and len(segs) == 2


def test_vtt_with_voice_tags():
    vtt = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.500\n<v Alice>Hello world</v>\n\n2\n00:00:05.000 --> 00:00:08.000\nBob: Hi"
    segs = parse_transcript(vtt, "x.vtt")
    assert segs[0] == {"speaker": "Alice", "text": "Hello world", "start_ms": 1000, "end_ms": 4500}
    assert segs[1]["speaker"] == "Bob"


def test_json_seconds_and_ms():
    data = [{"speaker": "A", "text": "hi", "start": 1.5, "end": 3}, {"speaker": "B", "text": "yo", "start_ms": 4000}]
    segs = parse_transcript(json.dumps(data), "t.json")
    assert segs[0]["start_ms"] == 1500 and segs[0]["end_ms"] == 3000 and segs[1]["start_ms"] == 4000


def test_out_of_order_starts_are_made_monotonic():
    segs = parse_transcript("[00:10] A: later\n[00:05] B: earlier")
    assert segs[1]["start_ms"] >= segs[0]["start_ms"]


@pytest.mark.parametrize("bad", ["", "   \n ", "[]", '{"x": 1}', "{bad json", '[1,2]'])
def test_bad_input_raises(bad):
    with pytest.raises(ValueError):
        parse_transcript(bad, "f.json" if bad.startswith(("[", "{")) else None)
