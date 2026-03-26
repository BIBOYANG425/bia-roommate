'use client'

import { RoommateProfile } from '@/lib/types'
import { getAvatarColor, getLastChar, relativeTime } from '@/lib/utils'

export default function ProfileCard({
  profile,
  onClick,
}: {
  profile: RoommateProfile
  onClick: () => void
}) {
  const avatarColor = getAvatarColor(profile.name)
  const lastChar = getLastChar(profile.name)

  return (
    <div
      className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3 cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
          {lastChar}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-stone-900 truncate">{profile.name}</h3>
          <p className="text-xs text-stone-500 truncate">
            {[
              profile.school,
              profile.year === '新生' && profile.enrollment_term
                ? `新生 (${profile.enrollment_term})`
                : profile.year,
              profile.major,
              profile.gender,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Tags */}
      {profile.tags && profile.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-200"
            >
              {tag}
            </span>
          ))}
          {profile.tags.length > 5 && (
            <span className="px-2 py-0.5 text-stone-400 text-xs">+{profile.tags.length - 5}</span>
          )}
        </div>
      )}

      {/* Bio preview */}
      {profile.bio && (
        <p className="text-sm text-stone-600 line-clamp-2">{profile.bio}</p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-stone-100 flex items-center justify-between">
        <span className="text-xs text-stone-400">{relativeTime(profile.created_at)}</span>
        <span className="text-xs text-green-600 font-medium">查看详情 →</span>
      </div>
    </div>
  )
}
