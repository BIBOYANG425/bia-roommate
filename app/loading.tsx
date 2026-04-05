export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--cream)] flex items-center justify-center">
      <div
        className="font-display text-4xl text-[var(--cardinal)] animate-pulse text-center"
        style={{ fontFamily: "var(--font-display)" }}
      >
        LOADING...
      </div>
    </div>
  );
}
