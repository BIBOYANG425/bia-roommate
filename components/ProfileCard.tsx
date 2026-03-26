'use client'

import { useState } from 'react'
import { RoommateProfile, SLEEP_OPTIONS, CLEAN_OPTIONS, NOISE_OPTIONS, STUDY_OPTIONS } from '@/lib/types'
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
  const [expanded, setExpanded] = useState(false)
  const avatarColor = getAvatarColor(profile.name)
  const lastChar = getLastChar(profile.name)

  const hasExpandedContent =
    profile.sleep_habit || profile.clean_level || profile.noise_level ||
    profile.study_style || profile.hobbies || profile.bio

  return (
    <div
      className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
          {lastChar}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-stone-900 truncate">{profile.name}</h3>
          <p className="text-xs text-stone-500 truncate">
            {[profile.year, profile.major, profile.gender].filter(Boolean).join(' · ')}
          </p>
        </div>
        {hasExpandedContent && (
          <svg
            className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Tags — always visible */}
      {profile.tags && profile.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(expanded ? profile.tags : profile.tags.slice(0, 5)).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-200"
            >
              {tag}
            </span>
          ))}
          {!expanded && profile.tags.length > 5 && (
            <span className="px-2 py-0.5 text-stone-400 text-xs">+{profile.tags.length - 5}</span>
          )}
        </div>
      )}

      {/* Expanded content */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden flex flex-col gap-3">
          {/* Habit Bars */}
          <div className="flex flex-col gap-1.5">
            <HabitBar label="睡眠" value={profile.sleep_habit} options={SLEEP_OPTIONS} />
            <HabitBar label="整洁" value={profile.clean_level} options={CLEAN_OPTIONS} />
            <HabitBar label="噪音" value={profile.noise_level} options={NOISE_OPTIONS} />
            <HabitBar label="学习" value={profile.study_style} options={STUDY_OPTIONS} />
          </div>

          {/* Hobbies */}
          {profile.hobbies && (
            <p className="text-xs text-stone-600">
              <span className="text-stone-400">兴趣爱好：</span>{profile.hobbies}
            </p>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-stone-600">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-stone-100 flex items-center justify-between">
        <span className="text-sm font-medium text-green-700">📱 {profile.contact}</span>
        <span className="text-xs text-stone-400">{relativeTime(profile.created_at)}</span>
      </div>
    </div>
  )
}
