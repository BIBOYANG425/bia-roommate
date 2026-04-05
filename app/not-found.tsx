import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--cream)] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1
          className="font-display text-[120px] leading-none text-[var(--cardinal)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          404
        </h1>
        <p
          className="font-body text-lg text-[var(--black)] mt-2 mb-8"
          style={{ fontFamily: "var(--font-body)" }}
        >
          PAGE NOT FOUND
        </p>
        <Link
          href="/"
          className="inline-block border-2 border-[var(--black)] bg-[var(--cardinal)] text-white px-6 py-3 font-bold text-sm tracking-wider hover:bg-[var(--black)] transition-colors"
          style={{ fontFamily: "var(--font-body)" }}
        >
          BACK TO HOME
        </Link>
      </div>
    </div>
  );
}
