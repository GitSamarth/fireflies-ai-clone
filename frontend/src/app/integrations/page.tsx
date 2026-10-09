"use client";
import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { BsMicrosoftTeams, BsSlack } from "react-icons/bs";
import { FaAws, FaSalesforce } from "react-icons/fa6";
import {
  SiAirtable, SiAsana, SiDropbox, SiGooglecalendar, SiGoogledrive, SiGooglemeet, SiHubspot,
  SiJira, SiLoom, SiNotion, SiTrello, SiWebex, SiZapier, SiZoom,
} from "react-icons/si";
import { useToast } from "@/components/Toast";

interface Integration { name: string; desc: string; Icon: IconType; color: string }

// Brand-coloured glyphs shown only to indicate where each integration would live. None is connected.
const INTEGRATIONS: Integration[] = [
  { name: "Zoom", desc: "Join and record Zoom meetings automatically.", Icon: SiZoom, color: "#0B5CFF" },
  { name: "Google Meet", desc: "Capture transcripts from Google Meet calls.", Icon: SiGooglemeet, color: "#00832D" },
  { name: "Microsoft Teams", desc: "Bring Teams meetings into your library.", Icon: BsMicrosoftTeams, color: "#6264A7" },
  { name: "Webex", desc: "Record and transcribe Webex meetings.", Icon: SiWebex, color: "#00A0D1" },
  { name: "Google Calendar", desc: "Choose which calendar events get recorded.", Icon: SiGooglecalendar, color: "#4285F4" },
  { name: "Slack", desc: "Post meeting summaries to a Slack channel.", Icon: BsSlack, color: "#4A154B" },
  { name: "Salesforce", desc: "Sync meeting notes to CRM records.", Icon: FaSalesforce, color: "#00A1E0" },
  { name: "HubSpot", desc: "Attach call summaries to contacts and deals.", Icon: SiHubspot, color: "#FF7A59" },
  { name: "Asana", desc: "Turn action items into Asana tasks.", Icon: SiAsana, color: "#F06A6A" },
  { name: "Jira", desc: "Create issues from meeting action items.", Icon: SiJira, color: "#0052CC" },
  { name: "Trello", desc: "Add action items as Trello cards.", Icon: SiTrello, color: "#0079BF" },
  { name: "Notion", desc: "Send notes and summaries to a Notion page.", Icon: SiNotion, color: "#111111" },
  { name: "Airtable", desc: "Push meeting data into your Airtable bases.", Icon: SiAirtable, color: "#18BFFF" },
  { name: "Google Drive", desc: "Save transcripts and summaries to Drive.", Icon: SiGoogledrive, color: "#1FA463" },
  { name: "Dropbox", desc: "Archive meeting files to Dropbox.", Icon: SiDropbox, color: "#0061FF" },
  { name: "Amazon S3", desc: "Sync transcripts to cloud storage.", Icon: FaAws, color: "#FF9900" },
  { name: "Loom", desc: "Pair video recordings with transcripts.", Icon: SiLoom, color: "#625DF5" },
  { name: "Zapier", desc: "Connect meetings to thousands of other apps.", Icon: SiZapier, color: "#FF4F00" },
];

export default function Integrations() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return INTEGRATIONS.filter((i) => i.name.toLowerCase().includes(term) || i.desc.toLowerCase().includes(term));
  }, [q]);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Integrations</h1>
        <span className="badge">Coming soon</span>
      </div>

      <div className="toolbar">
        <input className="search" type="search" aria-label="Search integrations" placeholder="Search integrations…"
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {shown.length === 0 ? (
        <div className="empty"><p>No integrations match “{q}”.</p></div>
      ) : (
        <div className="int-grid">
          {shown.map(({ name, desc, Icon, color }) => (
            <div key={name} className="int-card" data-testid="int-card">
              <div className="int-top">
                <span className="int-icon" style={{ color }} aria-hidden><Icon size={26} /></span>
                <span className="badge">Coming soon</span>
              </div>
              <b>{name}</b>
              <p className="muted">{desc}</p>
              <button className="btn sm" onClick={() => toast(`${name} integration is coming soon.`, "info")}>Connect</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}