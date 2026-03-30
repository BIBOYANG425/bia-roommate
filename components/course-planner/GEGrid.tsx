'use client'

import { GE_CATEGORIES } from '@/lib/course-planner/ge-categories'

interface GEGridProps {
  onSelect: (id: string, label: string) => void
  selectedIds: string[]
}

export default function GEGrid({ onSelect, selectedIds }: GEGridProps) {
  return (
    <div className="mt-8">
      <h3 className="font-display text-sm tracking-wider mb-4" style={{ color: 'var(--cardinal)' }}>
        GE CATEGORIES
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {GE_CATEGORIES.map((ge) => {
          const isSelected = selectedIds.includes(ge.id)
          return (
            <button
              key={ge.id}
              onClick={() => !isSelected && onSelect(ge.id, `${ge.id}: ${ge.name}`)}
              disabled={isSelected}
              className="text-left p-4 border-[2px] transition-all hover:translate-y-[-1px]"
              style={{
                borderColor: isSelected ? 'var(--mid)' : 'var(--beige)',
                background: isSelected ? 'var(--beige)' : 'white',
                borderLeftWidth: '4px',
                borderLeftColor: isSelected ? 'var(--mid)' : 'var(--cardinal)',
                opacity: isSelected ? 0.5 : 1,
                borderRadius: '4px',
                boxShadow: isSelected ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <span className="font-display text-base block" style={{ color: 'var(--cardinal)' }}>
                {ge.id}
              </span>
              <span className="text-xs" style={{ color: 'var(--mid)' }}>
                {ge.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
