'use client'

import { useEffect, useRef } from 'react'
import { usePlanner } from '@/lib/course-planner/store'

// Track in-flight fetches to prevent duplicates without dispatching null
const inFlight = new Set<string>()

export default function RmpBadge({ firstName, lastName }: { firstName: string; lastName: string }) {
  const { state, dispatch } = usePlanner()
  const key = `${lastName}, ${firstName}`
  const cached = state.rmpCache[key]
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (cached !== undefined || !lastName || inFlight.has(key)) return

    inFlight.add(key)

    fetch(`/api/rmp/search?name=${encodeURIComponent(`${firstName} ${lastName}`)}`)
      .then((r) => r.json())
      .then((data) => {
        if (mountedRef.current) {
          dispatch({ type: 'CACHE_RMP', key, rating: data ?? null })
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          dispatch({ type: 'CACHE_RMP', key, rating: null })
        }
      })
      .finally(() => inFlight.delete(key))
  }, [key, cached, firstName, lastName, dispatch])

  if (!lastName) return null
  if (cached === undefined) {
    return <span className="rmp-badge rmp-na">...</span>
  }
  if (!cached) {
    return <span className="rmp-badge rmp-na">N/A</span>
  }

  const cls = cached.avgRating >= 4 ? 'rmp-good' : cached.avgRating >= 3 ? 'rmp-ok' : 'rmp-bad'

  return (
    <span className={`rmp-badge ${cls}`} title={`${cached.numRatings} ratings`}>
      {cached.avgRating.toFixed(1)}
    </span>
  )
}
