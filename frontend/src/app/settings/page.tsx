export default function Settings() {
  return (
    <div className="page narrow">
      <h1>Settings</h1>
      <section className="card pad"><h3>Profile</h3><p className="muted">Demo User · demo@example.com</p><p className="muted">Real authentication is out of scope; you are always signed in as the demo user.</p></section>
      {["Notifications", "Transcription & language", "Recording bot", "Billing"].map((s) => (
        <section key={s} className="card pad row-between"><h3>{s}</h3><span className="badge">Coming soon</span></section>
      ))}
    </div>
  );
}
