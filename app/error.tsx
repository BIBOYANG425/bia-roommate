"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--cream)] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1
          className="font-display text-[80px] leading-none text-[var(--cardinal)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ERROR
        </h1>
        <p
          className="font-body text-sm text-[var(--mid)] mt-2 mb-6"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {error.message || "Something went wrong"}
        </p>
        <button
          onClick={reset}
          className="inline-block border-2 border-[var(--black)] bg-[var(--black)] text-white px-6 py-3 font-bold text-sm tracking-wider hover:bg-[var(--cardinal)] transition-colors cursor-pointer"
          style={{ fontFamily: "var(--font-body)" }}
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  );
}
