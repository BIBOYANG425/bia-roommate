"use client";

export interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="py-6 text-center">
      <p
        className="font-display text-sm tracking-wider"
        style={{ color: "var(--mid)" }}
      >
        {message}
      </p>
    </div>
  );
}
