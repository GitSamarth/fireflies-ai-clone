"use client";

import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiCheckSquare,
  FiClipboard,
  FiEdit3,
  FiList,
  FiTarget,
} from "react-icons/fi";
import { useToast } from "@/components/Toast";

interface AiApp {
  name: string;
  desc: string;
  Icon: IconType;
  color: string;
  featured?: boolean;
}

const AI_APPS: AiApp[] = [
  {
    name: "Daily Digest",
    desc: "Get a daily summary of your meetings, action items, and important updates.",
    Icon: FiCalendar,
    color: "#7C5CFC",
    featured: true,
  },
  {
    name: "BANT",
    desc: "Extract the Budget, Authority, Need and Timeline from your sales calls.",
    Icon: FiTarget,
    color: "#35C9E8",
    featured: true,
  },
  {
    name: "MEDDIC",
    desc: "Extract Metrics, Economic Buyer, Decision Criteria, Decision Process, and Pain.",
    Icon: FiClipboard,
    color: "#F28ACF",
  },
  {
    name: "Demo Scorecard",
    desc: "Create a scorecard for your sales representatives based on their demo performance.",
    Icon: FiBarChart2,
    color: "#4FD89A",
  },
  {
    name: "Executive Summary",
    desc: "Generate an executive summary with action items, notable mentions, and blockers.",
    Icon: FiBriefcase,
    color: "#9A7CFF",
    featured: true,
  },
  {
    name: "Action Items",
    desc: "Automatically identify and organize action items from your meetings.",
    Icon: FiList,
    color: "#50C7F2",
    featured: true,
  },
  {
    name: "Meeting Highlights",
    desc: "Extract the most important moments, decisions, and highlights from your meetings.",
    Icon: FiEdit3,
    color: "#F6A85D",
  },
  {
    name: "Sales Scorecard",
    desc: "Evaluate sales calls against predefined criteria and surface useful insights.",
    Icon: FiCheckCircle,
    color: "#65D9A1",
  },
  {
    name: "Meeting Insights",
    desc: "Surface recurring themes, decisions, and notable insights across your meetings.",
    Icon: FiCheckSquare,
    color: "#8C72F7",
  },
];

export default function AppsPage() {
  const toast = useToast();
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();

    return AI_APPS.filter(
      (app) =>
        app.name.toLowerCase().includes(term) ||
        app.desc.toLowerCase().includes(term),
    );
  }, [q]);

  const handleComingSoon = (name: string) => {
    toast(`${name} AI App is coming soon.`, "info");
  };

  return (
    <div className="page apps-page">
      <div className="page-head">
        <h1>AI Apps</h1>
        <span className="badge">Coming soon</span>
      </div>

      <div className="toolbar apps-toolbar">
        <input
          className="search"
          type="search"
          aria-label="Search AI Apps"
          placeholder="Search AI Apps..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="apps-section-head">
        <div>
          <h2>Top picks for you</h2>
          <p className="muted">
            Turn your meetings into useful insights automatically.
          </p>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <p>
            No AI Apps match &quot;{q}&quot;.
          </p>
        </div>
      ) : (
        <div className="apps-grid">
          {shown.map(({ name, desc, Icon, color, featured }) => (
            <div className="app-card" key={name}>
              <div className="app-card-main">
                <span
                  className="app-icon"
                  style={{
                    color,
                    backgroundColor: `${color}18`,
                  }}
                  aria-hidden
                >
                  <Icon size={22} strokeWidth={2.2} />
                </span>

                <div className="app-copy">
                  <div className="app-title-row">
                    <b>{name}</b>

                    {featured && (
                      <span className="app-featured">
                        Top pick
                      </span>
                    )}
                  </div>

                  <p className="muted">{desc}</p>
                </div>
              </div>

              <div className="app-card-side">
                <span className="badge">Coming soon</span>

                <button
                  type="button"
                  className={`app-toggle ${featured ? "on" : ""}`}
                  aria-label={`${name} coming soon`}
                  onClick={() => handleComingSoon(name)}
                >
                  <span />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}