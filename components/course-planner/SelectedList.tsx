'use client'

interface SelectedListProps {
  courses: { id: string; label: string }[]
  maxCourses: number
  onRemove: (id: string) => void
}

export default function SelectedList({ courses, maxCourses, onRemove }: SelectedListProps) {
  return (
    <div
      className="mb-6 p-4 border-[2px]"
      style={{
        borderColor: 'var(--beige)',
        background: 'white',
        borderRadius: '4px',
      }}
    >
      <h4 className="font-display text-xs tracking-wider mb-3" style={{ color: 'var(--mid)' }}>
        SELECTED ({courses.length}/{maxCourses})
      </h4>
      <div className="flex flex-col gap-2">
        {courses.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between py-2 px-3"
            style={{
              borderLeft: '3px solid var(--cardinal)',
              background: 'color-mix(in srgb, var(--cardinal) 4%, white)',
              borderRadius: '0 4px 4px 0',
            }}
          >
            <span className="text-sm" style={{ color: 'var(--black)' }}>
              {c.label}
            </span>
            <button
              onClick={() => onRemove(c.id)}
              className="text-lg leading-none px-2 hover:opacity-60 transition-opacity"
              style={{ color: 'var(--mid)' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
