TRANSCRIPT = "[00:00] Alice: Welcome to the launch review. I'll send the report tomorrow.\n[00:20] Bob: Pricing looks fine to me.\n[00:40] Alice: Let's schedule a follow up."


def mk(client, **kw):
    body = {"title": "Launch Review", "transcript": TRANSCRIPT, **kw}
    r = client.post("/api/meetings", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_seeded_library_sorted_recent(client):
    r = client.get("/api/meetings").json()
    assert r["total"] >= 5
    dates = [i["started_at"] for i in r["items"]]
    assert dates == sorted(dates, reverse=True)
    assert {"title", "duration_ms", "participants", "open_action_items"} <= r["items"][0].keys()


def test_sort_oldest_reverses(client):
    a = [i["id"] for i in client.get("/api/meetings?sort=recent").json()["items"]]
    b = [i["id"] for i in client.get("/api/meetings?sort=oldest").json()["items"]]
    assert a == b[::-1]


def test_filter_title_participant_date(client):
    assert [i["title"] for i in client.get("/api/meetings?q=standup").json()["items"]] == ["Engineering Standup"]
    by_p = client.get("/api/meetings?participant=aisha khan").json()
    assert by_p["total"] == 1
    assert client.get("/api/meetings?q=Aisha").json()["total"] == 1  # q also matches participants
    assert client.get("/api/meetings?date_from=2000-01-01&date_to=2000-01-02").json()["total"] == 0
    assert client.get("/api/meetings?date_from=2030-01-02&date_to=2030-01-01").status_code == 422
    assert client.get("/api/meetings?q=%25").json()["total"] == 0  # LIKE wildcard is escaped


def test_pagination_total_independent_of_limit(client):
    r = client.get("/api/meetings?limit=2&offset=0").json()
    assert len(r["items"]) == 2 and r["total"] >= 5
    assert client.get("/api/meetings?limit=0").status_code == 422


def test_detail_has_transcript_summary_chapters_actions(client):
    mid = client.get("/api/meetings").json()["items"][-1]["id"]
    d = client.get(f"/api/meetings/{mid}").json()
    assert d["segments"] and d["summary"]["overview"] and d["chapters"] and d["action_items"]
    starts = [s["start_ms"] for s in d["segments"]]
    assert starts == sorted(starts)
    seg_starts = set(starts)
    assert all(c["start_ms"] in seg_starts for c in d["chapters"])  # chapters seekable
    assert client.get("/api/meetings/99999").status_code == 404


def test_create_from_paste_and_persist(client):
    d = mk(client, participants=["Alice", "Bob", "alice"])
    assert d["participants"] == ["Alice", "Bob"]  # deduped case-insensitively
    assert d["summary"]["source"] == "heuristic" and len(d["segments"]) == 3
    assert d["duration_ms"] == d["segments"][-1]["end_ms"]
    again = client.get(f"/api/meetings/{d['id']}").json()
    assert again["title"] == "Launch Review"


def test_create_validation(client):
    assert client.post("/api/meetings", json={"title": "  ", "transcript": TRANSCRIPT}).status_code == 422
    assert client.post("/api/meetings", json={"title": "x", "transcript": ""}).status_code == 422
    r = client.post("/api/meetings", json={"title": "x", "transcript": "{bad", "filename": "a.json"})
    assert r.status_code == 422 and "JSON" in r.json()["detail"]
    n = client.get("/api/meetings").json()["total"]
    client.post("/api/meetings", json={"title": "x", "transcript": "{bad", "filename": "a.json"})
    assert client.get("/api/meetings").json()["total"] == n  # failed import leaves nothing behind


def test_edit_metadata_including_keeping_a_participant_name(client):
    d = mk(client, participants=["Alice", "Bob"])
    r = client.patch(f"/api/meetings/{d['id']}", json={"title": "Renamed", "participants": ["Alice", "Carol"]})
    assert r.status_code == 200, r.text
    assert r.json()["title"] == "Renamed" and r.json()["participants"] == ["Alice", "Carol"]
    assert client.patch(f"/api/meetings/{d['id']}", json={"participants": []}).status_code == 422
    assert client.patch(f"/api/meetings/{d['id']}", json={"title": " "}).status_code == 422


def test_delete_cascades(client):
    d = mk(client)
    item_id = d["action_items"][0]["id"] if d["action_items"] else client.post(
        f"/api/meetings/{d['id']}/action-items", json={"text": "x"}).json()["id"]
    assert client.delete(f"/api/meetings/{d['id']}").status_code == 204
    assert client.get(f"/api/meetings/{d['id']}").status_code == 404
    assert client.patch(f"/api/action-items/{item_id}", json={"completed": True}).status_code == 404
    assert client.delete(f"/api/meetings/{d['id']}").status_code == 404


def test_action_item_crud(client):
    d = mk(client)
    r = client.post(f"/api/meetings/{d['id']}/action-items", json={"text": " Ship it ", "assignee": "Bob", "due_date": "2030-05-01"})
    assert r.status_code == 201
    item = r.json()
    assert item["text"] == "Ship it" and item["completed"] is False and item["due_date"] == "2030-05-01"
    u = client.patch(f"/api/action-items/{item['id']}", json={"completed": True}).json()
    assert u["completed"] is True and u["assignee"] == "Bob"  # partial update keeps other fields
    u = client.patch(f"/api/action-items/{item['id']}", json={"text": "Ship it now", "assignee": None, "due_date": None}).json()
    assert u["text"] == "Ship it now" and u["assignee"] is None and u["due_date"] is None
    assert client.patch(f"/api/action-items/{item['id']}", json={"text": " "}).status_code == 422
    assert client.post(f"/api/meetings/{d['id']}/action-items", json={"text": "x", "due_date": "nope"}).status_code == 422
    assert client.post("/api/meetings/99999/action-items", json={"text": "x"}).status_code == 404
    assert client.delete(f"/api/action-items/{item['id']}").status_code == 204
    open_after = client.get(f"/api/meetings/{d['id']}").json()["action_items"]
    assert item["id"] not in [a["id"] for a in open_after]


def test_list_counts_open_items(client):
    d = mk(client)
    a = client.post(f"/api/meetings/{d['id']}/action-items", json={"text": "one"}).json()
    row = next(i for i in client.get("/api/meetings?q=Launch").json()["items"] if i["id"] == d["id"])
    before = row["open_action_items"]
    client.patch(f"/api/action-items/{a['id']}", json={"completed": True})
    row = next(i for i in client.get("/api/meetings?q=Launch").json()["items"] if i["id"] == d["id"])
    assert row["open_action_items"] == before - 1


def test_global_search(client):
    hits = client.get("/api/search?q=idempotency").json()
    assert hits and all("idempotency" in h["snippet"].lower() for h in hits)
    assert {"meeting_id", "start_ms", "segment_id"} <= hits[0].keys()
    assert client.get("/api/search?q=a").status_code == 422
    assert client.get("/api/search?q=zzzznotfound").json() == []


def test_participants_list(client):
    names = client.get("/api/meetings/participants").json()
    assert "Sarah Chen" in names and len(names) == len(set(names))
