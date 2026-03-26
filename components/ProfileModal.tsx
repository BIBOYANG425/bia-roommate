'use client'

import { useEffect } from 'react'
import { RoommateProfile, SLEEP_OPTIONS, CLEAN_OPTIONS, NOISE_OPTIONS, MUSIC_OPTIONS, STUDY_OPTIONS } from '@/lib/types'
import { getAvatarColor, getLastChar, relativeTime, habitLevel } from '@/lib/utils'

function HabitBar({ label, value, options }: { label: string; value: string | null; options: readonly string[] }) {
  if (!value) return null
  const level = habitLevel(value, options)
  const isCustom = level === 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-14 text-stone-500 shrink-0">{label}</span>
      {isCustom ? (
        <span className="flex-1 text-stone-600">{value}</span>
      ) : (
        <>
          <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${level}%` }}
            />
          </div>
          <span className="w-20 text-stone-600 text-right shrink-0">{value}</span>
        </>
      )}
    </div>
  )
}

export default function ProfileModal({
  profile,
  onClose,
}: {
  profile: RoommateProfile
  onClose: () => void
}) {
  const avatarColor = getAvatarColor(profile.name)
  const lastChar = getLastChar(profile.name)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const hasHabits = profile.sleep_habit || profile.clean_level || profile.noise_level || profile.music_habit || profile.study_style

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors text-stone-500 z-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-green-700 to-emerald-600 p-6 rounded-t-2xl text-white">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-2xl shrink-0 ring-4 ring-white/20`}>
              {lastChar}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.name}</h2>
              <p className="text-green-100 text-sm">
                {[
                  profile.year === '新生' && profile.enrollment_term
                    ? `新生 (${profile.enrollment_term})`
                    : profile.year,
                  profile.major,
                  profile.gender,
                ].filter(Boolean).join(' · ')}
              </p>
              <p className="text-green-200 text-xs mt-1">{relativeTime(profile.created_at)} 发布</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Contact — prominent */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="text-xs text-green-600 font-medium">联系方式</p>
              <p className="text-base font-semibold text-green-800">{profile.contact}</p>
            </div>
          </div>

          {/* Tags */}
          {profile.tags && profile.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-stone-800 mb-2">个性标签</h3>
              <div className="flex flex-wrap gap-2">
                {profile.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full border border-green-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Habits */}
          {hasHabits && (
            <div>
              <h3 className="text-sm font-semibold text-stone-800 mb-3">生活习惯</h3>
              <div className="flex flex-col gap-2.5">
                <HabitBar label="睡眠" value={profile.sleep_habit} options={SLEEP_OPTIONS} />
                <HabitBar label="整洁" value={profile.clean_level} options={CLEAN_OPTIONS} />
                <HabitBar label="噪音" value={profile.noise_level} options={NOISE_OPTIONS} />
                <HabitBar label="外放" value={profile.music_habit} options={MUSIC_OPTIONS} />
                <HabitBar label="学习" value={profile.study_style} options={STUDY_OPTIONS} />
              </div>
            </div>
          )}

          {/* Hobbies */}
          {profile.hobbies && (
            <div>
              <h3 className="text-sm font-semibold text-stone-800 mb-1">兴趣爱好</h3>
              <p className="text-sm text-stone-600">{profile.hobbies}</p>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div>
              <h3 className="text-sm font-semibold text-stone-800 mb-1">自我介绍</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
