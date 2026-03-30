'use client'

export default function SkeletonResults() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="brutal-card p-4 animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="h-5 w-3/4 mb-2" style={{ background: 'var(--beige)' }} />
          <div className="h-3 w-1/2" style={{ background: 'var(--beige)' }} />
        </div>
      ))}
    </div>
  )
}
