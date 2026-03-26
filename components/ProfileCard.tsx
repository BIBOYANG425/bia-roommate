'use client'

import { RoommateProfile, SLEEP_OPTIONS, CLEAN_OPTIONS, NOISE_OPTIONS } from '@/lib/types'
import { getAvatarColor, getLastChar, relativeTime, habitLevel } from '@/lib/utils'

function HabitBar({ label, value, options }: { label: string; value: string | null; options: readonly string[] }) {
  const level = habitLevel(value, options)
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 text-stone-500 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${level}%` }}
        />
      </div>
      <span className="w-16 text-stone-600 text-right shrink-0">{value}</span>
    </div>
  )
}

export default function ProfileCard({ profile }: { profile: RoommateProfile }) {
  const avatarColor = getAvatarColor(profile.name)
  const lastChar = getLastChar(profile.name)

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
          {lastChar}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-stone-900 truncate">{profile.name}</h3>
          <p className="text-xs text-stone-500 truncate">
            {[profile.year, profile.major, profile.gender].filter(Boolean).join(' · ')}
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

      {/* Habit Bars */}
      <div className="flex flex-col gap-1.5">
        <HabitBar label="睡眠" value={profile.sleep_habit} options={SLEEP_OPTIONS} />
        <HabitBar label="整洁" value={profile.clean_level} options={CLEAN_OPTIONS} />
        <HabitBar label="噪音" value={profile.noise_level} options={NOISE_OPTIONS} />
      </div>

      {/* Hobbies */}
      {profile.hobbies && (
        <p className="text-xs text-stone-600">
          <span className="text-stone-400">兴趣爱好：</span>{profile.hobbies}
        </p>
      )}

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-stone-600 line-clamp-2">{profile.bio}</p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-stone-100 flex items-center justify-between">
        <span className="text-sm font-medium text-green-700">📱 {profile.contact}</span>
        <span className="text-xs text-stone-400">{relativeTime(profile.created_at)}</span>
      </div>
    </div>
  )
}
