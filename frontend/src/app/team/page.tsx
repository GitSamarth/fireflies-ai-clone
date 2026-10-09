"use client";

import { useMemo, useState } from "react";
import {
  FiMail,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import { useToast } from "@/components/Toast";

interface Member {
  name: string;
  email: string;
  role: "Admin" | "Member";
  initials: string;
}

const MEMBERS: Member[] = [
  {
    name: "Samarth Mahajan",
    email: "samarth@workspace.com",
    role: "Admin",
    initials: "SM",
  },
  {
    name: "Alex Johnson",
    email: "alex@workspace.com",
    role: "Member",
    initials: "AJ",
  },
  {
    name: "Priya Sharma",
    email: "priya@workspace.com",
    role: "Member",
    initials: "PS",
  },
  {
    name: "Rahul Mehta",
    email: "rahul@workspace.com",
    role: "Member",
    initials: "RM",
  },
];

export default function TeamPage() {
  const toast = useToast();
  const [query, setQuery] = useState("");

  const members = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return MEMBERS;

    return MEMBERS.filter(
      (member) =>
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.role.toLowerCase().includes(term),
    );
  }, [query]);

  const comingSoon = (message: string) => {
    toast(message, "info");
  };

  return (
    <div className="page team-page">
      <div className="page-head">
        <div>
          <h1>Team</h1>
          <p className="muted">
            Manage your workspace members and collaboration.
          </p>
        </div>

        
      </div>

      <div className="team-toolbar">
        <div className="team-search">
          <FiSearch size={17} aria-hidden />
          <input
            type="search"
            aria-label="Search team members"
            placeholder="Search team members..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={() =>
            comingSoon("Inviting team members is coming soon.")
          }
        >
          <FiPlus size={16} />
          Invite member
        </button>
      </div>

      <div className="team-card">
        <div className="team-card-head">
          <div>
            <h2>Team members</h2>
            <p className="muted">
              {MEMBERS.length} members in your workspace
            </p>
          </div>

          <FiUsers size={20} className="muted" aria-hidden />
        </div>

        {members.length === 0 ? (
          <div className="empty team-empty">
            <FiUsers size={28} />
            <p>No team members match "{query}".</p>
          </div>
        ) : (
          <div className="member-list">
            {members.map((member) => (
              <div className="member-row" key={member.email}>
                <div className="member-avatar">
                  {member.initials}
                </div>

                <div className="member-info">
                  <b>{member.name}</b>
                  <span>
                    <FiMail size={13} />
                    {member.email}
                  </span>
                </div>

                <span
                  className={`role-badge ${
                    member.role === "Admin" ? "admin" : ""
                  }`}
                >
                  {member.role}
                </span>

                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`More options for ${member.name}`}
                  onClick={() =>
                    comingSoon("Team member management is coming soon.")
                  }
                >
                  <FiMoreHorizontal size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="team-note">
        <span className="badge">Coming soon</span>
        <p className="muted">
          Team management, invitations, permissions, and collaboration
          features are not connected in this demo.
        </p>
      </div>
    </div>
  );
}