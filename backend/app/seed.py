"""Seed data: 5 condensed meetings with transcripts, summaries, chapters and action items.

Timings are derived from word counts via the same code path as imports, so
seeded and uploaded meetings behave identically.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models as m
from .parsing import finalize_segments

S, M, P, T, E, D = ("Sarah Chen", "Marcus Patel", "Priya Nair", "Tom Alvarez", "Elena Rossi", "Devon Brooks")

MEETINGS = [
    dict(
        title="Q3 Roadmap Sync", days_ago=1, hour=10, people=[S, M, P, T],
        lines=[
            (S, "Good morning everyone. Today we need to lock the Q3 roadmap, so I'd like to start with the pricing experiment and then move to the mobile app timeline."),
            (M, "I pulled the numbers last night. The new pricing page lifted trial signups by eleven percent, but churn on the annual plan went up slightly, so I don't think we can call it a clean win."),
            (S, "That churn number worries me. Do we know whether it's the price itself or the way we explain the annual discount?"),
            (M, "Support tickets suggest it's the explanation. Customers thought the discount was a one-time offer. I'll rewrite the copy and rerun the test for two weeks."),
            (P, "On the engineering side, the pricing page is behind a feature flag already, so rerunning the experiment costs us almost nothing. I can have the flag config ready by Wednesday."),
            (S, "Great. Let's move to mobile. Tom, where are we on the onboarding rewrite?"),
            (T, "We're about sixty percent done. The sign-in flow and the permissions screens are finished. The remaining work is the first-run checklist and the analytics events."),
            (P, "The analytics events are the risky part. Last time we shipped without them we couldn't measure activation, so I'd rather slip a week than ship blind."),
            (S, "Agreed, no shipping blind. Tom, can you confirm the new date with design before Friday?"),
            (T, "Yes, I'll confirm with design and send the revised date to the whole group by Friday."),
            (M, "One more topic. The enterprise customers keep asking for single sign-on. Sales says it blocks three deals worth about four hundred thousand dollars combined."),
            (P, "SSO is a big piece of work. Realistically it's six weeks of engineering, so it can't land in Q3 unless we drop something else."),
            (S, "Let's not decide that today. Priya, please write a short scoping document with the tradeoffs so we can decide at the next sync."),
            (P, "I'll draft the SSO scoping document and share it before the next roadmap sync."),
            (S, "Perfect. To recap: rerun the pricing test, confirm the mobile date, and scope SSO. Thanks, everyone."),
        ],
        overview="The team reviewed the Q3 roadmap. The pricing experiment raised trial signups by 11% but also nudged annual-plan churn, which Marcus traced to unclear discount copy; the test will be rerun. Mobile onboarding is about 60% complete and will slip a week to ship with analytics events. Sales flagged SSO as a blocker for roughly $400k of deals, so Priya will scope the work before a decision.",
        keywords=["pricing", "churn", "onboarding", "analytics", "SSO", "roadmap"],
        chapters=[(0, "Agenda & pricing results"), (5, "Mobile onboarding status"), (10, "SSO request from sales"), (14, "Recap")],
        notes=["Pricing page raised trial signups 11%; annual churn rose slightly, likely due to discount wording.",
               "Experiment is flag-controlled, so a rerun is cheap.", "Mobile onboarding ~60% done; shipping slips one week to include analytics events.",
               "SSO blocks ~3 enterprise deals (~$400k); estimated six weeks of engineering."],
        items=[("Rewrite annual-discount copy and rerun the pricing test for two weeks", M, 7, False),
               ("Prepare feature-flag config for the pricing rerun", P, 5, True),
               ("Confirm revised mobile onboarding date with design and share with the group", T, 3, False),
               ("Draft SSO scoping document with tradeoffs", P, 12, False)],
    ),
    dict(
        title="Acme Corp Discovery Call", days_ago=3, hour=15, people=[E, S, "Jordan Reyes"],
        lines=[
            (S, "Thanks for making time, Jordan. Before I show anything, I'd love to understand how your team handles meeting notes today."),
            ("Jordan Reyes", "Honestly, it's chaos. Everyone keeps their own notes, and action items disappear. Last quarter we missed a renewal deadline because nobody wrote down who owned the follow-up."),
            (S, "That's a common story. How many people join customer calls on a typical week?"),
            ("Jordan Reyes", "About forty across sales and customer success. Most of the calls are on Zoom, a few on Google Meet."),
            (E, "From a security perspective, we'll need to know where transcripts are stored and who can read them. Our legal team is strict about customer data."),
            (S, "Understood. Access is controlled per meeting and per workspace, and I can send our security overview after the call."),
            ("Jordan Reyes", "That would help. What about search? If I remember a customer mentioned a competitor, can I find that call quickly?"),
            (S, "Yes, search works across every transcript and jumps you to the exact moment in the recording, so you don't have to rewatch the whole call."),
            (E, "Budget-wise, we're planning for the next fiscal year, so a decision before the end of next month is realistic."),
            ("Jordan Reyes", "Let's do a pilot with the customer success team first. If they like it we can roll it out to sales."),
            (S, "Great plan. I'll send the security overview and a pilot proposal by Tuesday, and set up a follow-up call next week."),
            (E, "I'll loop in our legal contact so they can review the security document in parallel."),
        ],
        overview="Discovery call with Acme Corp. Their roughly forty customer-facing staff keep separate notes and have lost follow-ups, including a missed renewal. Key needs are secure transcript storage, cross-call search, and Zoom/Meet coverage. Acme proposed a pilot with customer success, with a decision expected before the end of next month.",
        keywords=["notes", "security", "search", "pilot", "renewal", "Zoom"],
        chapters=[(0, "Current note-taking pain"), (4, "Security & search needs"), (8, "Budget & pilot plan")],
        notes=["~40 people on customer calls weekly; mostly Zoom, some Google Meet.", "A renewal was missed because follow-up ownership was never recorded.",
               "Legal requires clarity on transcript storage and access.", "Agreed to pilot with customer success before wider rollout."],
        items=[("Send security overview and pilot proposal to Jordan", S, 4, False),
               ("Schedule follow-up call for next week", S, 6, False),
               ("Loop in Acme legal contact to review security document", E, 5, False)],
    ),
    dict(
        title="Engineering Standup", days_ago=0, hour=9, people=[P, T, D],
        lines=[
            (P, "Quick standup. I'll go first. Yesterday I finished the migration script for the new notifications table, and today I'm running it against the staging copy."),
            (T, "I merged the onboarding checklist component. Today I'm wiring up the analytics events, and I'm blocked on the event naming convention."),
            (P, "The naming convention is in the wiki under data standards. Use object underscore action, so checklist underscore completed for example."),
            (T, "Perfect, that unblocks me. Thanks, Priya."),
            (D, "I'm on the payments bug. The duplicate charge only happens when the webhook retries within two seconds, so I suspect a missing idempotency key."),
            (P, "That matches what I saw in the logs last week. Add the idempotency check and write a regression test before you merge."),
            (D, "Will do. I'll have a fix up for review by end of day."),
            (T, "Heads up, the staging environment is flaky this morning. Two of my test runs failed with timeouts that had nothing to do with my change."),
            (P, "I'll look at staging right after standup. It might be the database restore I'm running, so give me an hour."),
        ],
        overview="Short engineering standup. Priya is running the notifications-table migration on staging; Tom is wiring analytics events after getting the event naming convention; Devon traced the duplicate-charge bug to a missing idempotency key on webhook retries. Staging flakiness is being investigated.",
        keywords=["migration", "analytics", "idempotency", "webhook", "staging", "payments"],
        chapters=[(0, "Migration & analytics updates"), (4, "Payments duplicate-charge bug"), (7, "Staging flakiness")],
        notes=["Event naming: object_action (e.g. checklist_completed).", "Duplicate charge occurs when webhook retries within two seconds.",
               "Staging timeouts may be caused by the in-progress database restore."],
        items=[("Add idempotency check for payment webhooks with a regression test", D, 1, False),
               ("Investigate flaky staging environment", P, 0, False),
               ("Finish wiring checklist analytics events", T, 2, False)],
    ),
    dict(
        title="Mobile Onboarding Design Review", days_ago=6, hour=14, people=[E, T, S, "Aisha Khan"],
        lines=[
            (E, "Let's walk through the new onboarding flow. I've reduced it from seven screens to four, and moved the permissions requests until the moment they're actually needed."),
            (T, "Engineering likes that. Asking for notifications permission on the first screen had a terrible opt-in rate in the old build."),
            ("Aisha Khan", "In the usability sessions, three of five participants hesitated on the profile screen. They weren't sure whether the photo was required."),
            (E, "Good catch. I'll mark the photo as optional and add a skip link so it's obvious."),
            (S, "What about the progress indicator? I like the dots, but they don't tell people how much is left."),
            (E, "I can switch to a simple step counter. Step two of four is clearer than four dots."),
            (T, "That's easy to build. Please keep the contrast ratio accessible, since we've had accessibility complaints before."),
            (E, "Understood. I'll run the colors through the contrast checker and attach the results to the design file."),
            (S, "Great. Aisha, can you schedule another round of usability tests once the changes are in?"),
            ("Aisha Khan", "Yes, I'll book five participants for next Thursday and share the recordings."),
        ],
        overview="Design review of the new four-screen mobile onboarding. Permissions are now requested in context. Usability testing showed hesitation about whether the profile photo is required, so it will be optional with a skip link. The progress dots will become a step counter, and accessibility contrast will be verified. A second usability round is planned.",
        keywords=["onboarding", "permissions", "usability", "accessibility", "progress", "profile"],
        chapters=[(0, "New four-screen flow"), (2, "Usability findings"), (4, "Progress indicator & accessibility"), (8, "Next test round")],
        notes=["Flow reduced from seven screens to four.", "Permissions requested at point of need.", "Profile photo becomes optional with skip link.", "Step counter replaces progress dots."],
        items=[("Make profile photo optional and add a skip link", E, 4, False),
               ("Replace progress dots with a step counter and check color contrast", E, 5, False),
               ("Book five participants for the next usability round", "Aisha Khan", 8, False)],
    ),
    dict(
        title="1:1 — Sarah & Marcus", days_ago=9, hour=11, people=[S, M],
        lines=[
            (S, "Thanks for making time. How are you feeling about the workload this month?"),
            (M, "Busy but manageable. The pricing analysis is taking most of my time, and I'd like to hand off the weekly metrics report if possible."),
            (S, "That makes sense. Who do you think could take it over?"),
            (M, "Priya's team already has the dashboards, so I think they could own it with a short handover document from me."),
            (S, "Okay, I'll ask Priya. Separately, you mentioned wanting more exposure to the enterprise side. There's an upcoming SSO conversation you could join."),
            (M, "I'd love that. I'll sit in on the customer calls and take notes on the requirements."),
            (S, "Perfect. Let's also set a goal for next quarter. What would you like to be known for?"),
            (M, "I want to be the person who turns messy data into clear decisions. A pricing playbook would be a good proof point."),
            (S, "I like that. Let's draft the playbook outline together next month."),
        ],
        overview="Sarah and Marcus discussed workload, agreeing to hand the weekly metrics report to Priya's team with a handover document. Marcus will join enterprise SSO customer calls for exposure, and set a goal of producing a pricing playbook next quarter.",
        keywords=["workload", "metrics", "handover", "enterprise", "playbook", "goals"],
        chapters=[(0, "Workload"), (4, "Growth opportunities"), (6, "Next-quarter goal")],
        notes=["Weekly metrics report to move to Priya's team.", "Marcus to attend enterprise SSO calls.", "Goal: pricing playbook next quarter."],
        items=[("Write handover document for the weekly metrics report", M, 7, False),
               ("Ask Priya whether her team can own the metrics report", S, 2, True),
               ("Draft pricing playbook outline together", S, 30, False)],
    ),
]


def seed_if_empty(db: Session) -> int:
    if db.scalar(select(func.count()).select_from(m.Meeting)):
        return 0
    base = datetime.now(timezone.utc).replace(tzinfo=None).replace(minute=0, second=0, microsecond=0)
    for spec in MEETINGS:
        segs = finalize_segments([{"speaker": sp, "text": tx, "start_ms": None, "end_ms": None} for sp, tx in spec["lines"]])
        started = (base - timedelta(days=spec["days_ago"])).replace(hour=spec["hour"])
        mt = m.Meeting(title=spec["title"], started_at=started, duration_ms=max(x["end_ms"] for x in segs))
        mt.participants = [m.Participant(name=n) for n in spec["people"]]
        mt.segments = [m.TranscriptSegment(idx=i, **x) for i, x in enumerate(segs)]
        mt.summary = m.Summary(overview=spec["overview"], keywords=spec["keywords"], notes=spec["notes"], source="seed")
        mt.chapters = [m.Chapter(start_ms=segs[i]["start_ms"], title=t) for i, t in spec["chapters"]]
        mt.action_items = [m.ActionItem(text=t, assignee=a, completed=done,
                                        due_date=(started + timedelta(days=d)).date().isoformat())
                           for t, a, d, done in spec["items"]]
        db.add(mt)
    db.commit()
    return len(MEETINGS)
