'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: '找室友' },
  { href: '/course-planner', label: '选课' },
  { href: '/usc-group', label: 'USC 新生群' },
]

export default function NavTabs() {
  const pathname = usePathname()

  return (
    <nav className="border-b-[3px] border-[var(--black)] flex" style={{ background: 'var(--cream)' }}>
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="font-display text-sm sm:text-base tracking-[0.1em] px-5 sm:px-8 py-3 border-r-[3px] border-[var(--black)] transition-colors"
            style={active
              ? { background: 'var(--cardinal)', color: 'white' }
              : { background: 'var(--cream)', color: 'var(--mid)' }
            }
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
