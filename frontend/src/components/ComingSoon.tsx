export default function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="page narrow">
      <h1>{title}</h1>
      <div className="empty"><span className="badge">Coming soon</span><p>{blurb}</p></div>
    </div>
  );
}
