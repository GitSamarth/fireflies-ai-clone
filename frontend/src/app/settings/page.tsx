"use client";

import {
  FiBell,
  FiCreditCard,
  FiGlobe,
  FiMic,
  FiUser,
} from "react-icons/fi";
import { useToast } from "@/components/Toast";

const SETTINGS = [
  {
    title: "Notifications",
    description: "Manage meeting and activity notifications.",
    Icon: FiBell,
  },
  {
    title: "Transcription & Language",
    description: "Choose transcription and language preferences.",
    Icon: FiGlobe,
  },
  {
    title: "Recording Bot",
    description: "Configure how the meeting recording bot behaves.",
    Icon: FiMic,
  },
  {
    title: "Billing",
    description: "Manage your subscription and billing details.",
    Icon: FiCreditCard,
  },
];

export default function SettingsPage() {
  const toast = useToast();

  return (
    <div className="page settings-page">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">
            Manage your account and workspace preferences.
          </p>
        </div>
      </div>

      <section className="settings-card profile-card">
        <div className="setting-icon">
          <FiUser size={20} />
        </div>

        <div className="setting-content">
          <div className="setting-title">Profile</div>
          <div className="setting-value">Demo User</div>
          <div className="setting-email">demo@example.com</div>

        </div>

        <button
          type="button"
          className="btn sm"
          onClick={() =>
            toast("Profile settings are coming soon.", "info")
          }
        >
          Edit
        </button>
      </section>

      <div className="settings-section">
        <div className="settings-section-title">Preferences</div>

        <div className="settings-card">
          {SETTINGS.map(({ title, description, Icon }) => (
            <button
              key={title}
              type="button"
              className="setting-row"
              onClick={() =>
                toast(`${title} settings are coming soon.`, "info")
              }
            >
              <span className="setting-icon">
                <Icon size={19} />
              </span>

              <span className="setting-content">
                <strong>{title}</strong>
                <span className="setting-description">
                  {description}
                </span>
              </span>

              <span className="badge">Coming soon</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}