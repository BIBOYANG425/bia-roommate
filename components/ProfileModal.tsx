'use client'

import { useEffect } from 'react'
import { RoommateProfile, SLEEP_OPTIONS, CLEAN_OPTIONS, NOISE_OPTIONS, MUSIC_OPTIONS, STUDY_OPTIONS } from '@/lib/types'
import { getLastChar, relativeTime, habitLevel, schoolAccent, schoolGold, schoolTagClass, schoolHabitClass } from '@/lib/utils'

function HabitBar({ label, value, options, habitClass }: { label: string; value: string | null; options: readonly string[]; habitClass?: string }) {
  if (!value) return null
  const level = habitLevel(value, options)
  const isCustom = level === 0
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-14 uppercase tracking-wider" style={{ color: 'var(--mid)' }}>{label}</span>
      {isCustom ? (
        <span style={{ color: 'var(--black)' }}>{value}</span>
      ) : (
        <>
          <div className="flex-1 habit-bar-bg">
            <div className={habitClass || 'habit-bar-fill'} style={{ width: `${level}%` }} />
          </div>
          <span className="w-20 text-right" style={{ color: 'var(--black)' }}>{value}</span>
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
  const lastChar = getLastChar(profile.name)
  const accent = schoolAccent(profile.school)
  const gold = schoolGold(profile.school)
  const tagClass = schoolTagClass(profile.school)
  const habitClass = schoolHabitClass(profile.school)

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

  const subtitleParts = [
    profile.school,
    profile.year === '新生' && profile.enrollment_term
      ? `新生 (${profile.enrollment_term})`
      : profile.year,
    profile.major,
    profile.gender,
  ].filter(Boolean)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 animate-fade-in" style={{ background: 'rgba(26,20,16,0.7)' }} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up brutal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center border-[3px] border-[var(--black)] z-10 font-display text-lg hover:bg-[var(--gold)] transition-colors"
          style={{ background: 'var(--cream)' }}
        >
          X
        </button>

        {/* Header */}
        <div className="p-6 border-b-[3px] border-[var(--black)] relative" style={{ background: accent }}>
          <div className="ghost-text right-0 top-0 text-[100px]" style={{ color: 'white', opacity: 0.08 }}>BIA</div>
          <div className="flex items-center gap-4 relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-16 h-16 object-cover border-[3px] border-white shrink-0"
              />
            ) : (
              <div
                className="w-16 h-16 flex items-center justify-center text-white font-display text-3xl border-[3px] border-white shrink-0"
              >
                {lastChar}
              </div>
            )}
            <div>
              <h2 className="font-display text-3xl text-white">{profile.name}</h2>
              <p className="text-xs text-white/70">
                {subtitleParts.join(' / ')}
              </p>
              <p className="text-[10px] text-white/50 mt-1 uppercase tracking-wider">
                {relativeTime(profile.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Contact — prominent */}
          <div className="p-4 border-[3px] border-[var(--black)]" style={{ background: gold }}>
            <p className="text-[10px] uppercase tracking-wider font-display mb-1" style={{ color: 'var(--black)' }}>CONTACT</p>
            <p className="font-display text-2xl" style={{ color: 'var(--black)' }}>{profile.contact}</p>
          </div>

          {/* Tags */}
          {profile.tags && profile.tags.length > 0 && (
            <div>
              <h3 className="font-display text-sm tracking-wider mb-2" style={{ color: 'var(--mid)' }}>TAGS</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.tags.map((tag, i) => (
                  <span key={tag} className={i === 0 ? `brutal-tag ${tagClass}` : 'brutal-tag'}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Habits */}
          {hasHabits && (
            <div>
              <h3 className="font-display text-sm tracking-wider mb-3" style={{ color: 'var(--mid)' }}>HABITS</h3>
              <div className="flex flex-col gap-3">
                <HabitBar label="SLEEP" value={profile.sleep_habit} options={SLEEP_OPTIONS} habitClass={habitClass} />
                <HabitBar label="CLEAN" value={profile.clean_level} options={CLEAN_OPTIONS} habitClass={habitClass} />
                <HabitBar label="NOISE" value={profile.noise_level} options={NOISE_OPTIONS} habitClass={habitClass} />
                <HabitBar label="MUSIC" value={profile.music_habit} options={MUSIC_OPTIONS} habitClass={habitClass} />
                <HabitBar label="STUDY" value={profile.study_style} options={STUDY_OPTIONS} habitClass={habitClass} />
              </div>
            </div>
          )}

          {/* Hobbies */}
          {profile.hobbies && (
            <div>
              <h3 className="font-display text-sm tracking-wider mb-1" style={{ color: 'var(--mid)' }}>HOBBIES</h3>
              <p className="text-xs" style={{ color: 'var(--black)' }}>{profile.hobbies}</p>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div>
              <h3 className="font-display text-sm tracking-wider mb-1" style={{ color: 'var(--mid)' }}>BIO</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--black)' }}>{profile.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
