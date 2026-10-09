"use client";

import {
  FiMic,
  FiPhone,
  FiSearch,
  FiUsers,
  FiMessageSquare,
  FiPlus,
} from "react-icons/fi";
import { useToast } from "@/components/Toast";

const AGENTS = [
  {
    name: "Screening Interview Agent",
    description:
      "Hire faster with automatic screening calls that assess candidate skills.",
    icon: FiUsers,
    color: "#f39acb",
  },
  {
    name: "Discovery Call Agent",
    description:
      "Qualify prospects with focused discovery calls that uncover needs and buying signals.",
    icon: FiPhone,
    color: "#53d5e8",
  },
  {
    name: "Progress Check-In Agent",
    description:
      "Keep teams aligned with quick check-ins that surface blockers and next steps.",
    icon: FiMessageSquare,
    color: "#aaa0ff",
  },
  {
    name: "User Testimonial Agent",
    description:
      "Capture real customer stories and turn them into ready-to-use testimonials.",
    icon: FiMic,
    color: "#9eb7ff",
  },
  {
    name: "Research Agent",
    description:
      "Conduct structured conversations and collect valuable customer insights.",
    icon: FiSearch,
    color: "#72dca8",
  },
  {
    name: "Customer Feedback Agent",
    description:
      "Collect structured feedback from customers through automated conversations.",
    icon: FiUsers,
    color: "#f5b6df",
  },
];

export default function VoiceAgentsPage() {
  const toast = useToast();

  return (
    <div className="page voice-agents-page">
      {/* Hero */}
      <div className="voice-agent-hero">
        <div className="voice-agent-hero-content">
          <span className="badge">
            ✦ 100 free AI credits
          </span>

          <h1>Experience Voice Agents</h1>

          <p>
            Voice Agents handle your calls, ask the right questions,
            and deliver clear insights.
          </p>
        </div>

        <div className="voice-agent-visual">
          <FiMic size={34} />
        </div>
      </div>

      {/* Header */}
      <div className="voice-agent-header">
        <div>
          <h2>Set up your Voice Agent in 2 minutes</h2>
          <p className="muted">
            Create an agent or start with one of our templates.
          </p>
        </div>

        <button
          className="btn primary"
          onClick={() =>
            toast("Custom Voice Agents are coming soon.", "info")
          }
        >
          <FiPlus size={16} />
          Custom Agent
        </button>
      </div>

      {/* Coming soon */}
      <div className="voice-agent-notice">
        <span className="badge">Coming soon</span>
        <span>
          Voice Agents are not connected in this demo.
        </span>
      </div>

      {/* Agents */}
      <div className="agent-grid">
        {AGENTS.map(
          ({ name, description, icon: Icon, color }) => (
            <div className="agent-card" key={name}>
              <div
                className="agent-icon"
                style={{ background: color }}
              >
                <Icon size={23} />
              </div>

              <div className="agent-card-content">
                <h3>{name}</h3>

                <p className="muted">
                  {description}
                </p>
              </div>

              <button
                className="btn sm"
                onClick={() =>
                  toast(`${name} is coming soon.`, "info")
                }
              >
                Set-Up
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}