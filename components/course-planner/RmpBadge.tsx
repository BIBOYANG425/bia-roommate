'use client'

import { useEffect } from 'react'
import { usePlanner } from '@/lib/course-planner/store'

export default function RmpBadge({ firstName, lastName }: { firstName: string; lastName: string }) {
  const { state, dispatch } = usePlanner()
  const key = `${lastName}, ${firstName}`
  const cached = state.rmpCache[key]

  useEffect(() => {
    if (cached !== undefined || !lastName) return

    dispatch({ type: 'CACHE_RMP', key, rating: null })

    fetch(`/api/rmp/search?name=${encodeURIComponent(`${firstName} ${lastName}`)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data) dispatch({ type: 'CACHE_RMP', key, rating: data })
      })
      .catch(() => {})
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
