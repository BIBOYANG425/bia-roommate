'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  VALID_TAGS,
  SLEEP_OPTIONS,
  CLEAN_OPTIONS,
  NOISE_OPTIONS,
  MUSIC_OPTIONS,
  STUDY_OPTIONS,
  GENDER_OPTIONS,
  YEAR_OPTIONS,
  ENROLLMENT_OPTIONS,
  SCHOOL_OPTIONS,
} from '@/lib/types'

function RadioGroup({
  label,
  options,
  value,
  onChange,
  customizable,
  customValue,
  onCustomChange,
  customPlaceholder,
}: {
  label: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
  customizable?: boolean
  customValue?: string
  onCustomChange?: (v: string) => void
  customPlaceholder?: string
}) {
  const isCustom = value === '__custom__'
  return (
    <div>
      <label className="font-display text-sm tracking-wider block mb-2" style={{ color: 'var(--mid)' }}>{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
            style={value === opt ? { background: 'var(--cardinal)', color: 'white', borderColor: 'var(--cardinal)' } : {}}
          >
            {opt}
          </button>
        ))}
        {customizable && (
          <button
            type="button"
            onClick={() => onChange(isCustom ? '' : '__custom__')}
            className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
            style={isCustom ? { background: 'var(--gold)', color: 'var(--black)', borderColor: 'var(--black)' } : { borderStyle: 'dashed' }}
          >
            CUSTOM
          </button>
        )}
      </div>
      {isCustom && (
        <input
          type="text"
          value={customValue || ''}
          onChange={(e) => onCustomChange?.(e.target.value)}
          placeholder={customPlaceholder || ''}
          className="brutal-input mt-2"
        />
      )}
    </div>
  )
}

export default function SubmitPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [school, setSchool] = useState('')
  const [gender, setGender] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [enrollmentTerm, setEnrollmentTerm] = useState('')
  const [contact, setContact] = useState('')
  const [sleepHabit, setSleepHabit] = useState('')
  const [customSleep, setCustomSleep] = useState('')
  const [cleanLevel, setCleanLevel] = useState('')
  const [noiseLevel, setNoiseLevel] = useState('')
  const [musicHabit, setMusicHabit] = useState('')
  const [studyStyle, setStudyStyle] = useState('')
  const [hobbies, setHobbies] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [bio, setBio] = useState('')

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('IMAGE TOO LARGE — MAX 2MB')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !contact.trim()) return

    setSubmitting(true)
    setError(null)

    let avatarUrl: string | null = null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true })
      if (uploadErr) {
        setError('AVATAR UPLOAD FAILED — TRY AGAIN')
        setSubmitting(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)
      avatarUrl = publicUrl
    }

    const finalSleep = sleepHabit === '__custom__' ? (customSleep.trim() || null) : (sleepHabit || null)

    const formData = {
      name: name.trim(),
      avatar_url: avatarUrl,
      school: school || null,
      gender: gender || null,
      major: major.trim() || null,
      year: year || null,
      enrollment_term: year === '新生' ? (enrollmentTerm || null) : null,
      contact: contact.trim(),
      sleep_habit: finalSleep,
      clean_level: cleanLevel || null,
      noise_level: noiseLevel || null,
      music_habit: musicHabit || null,
      study_style: studyStyle || null,
      hobbies: hobbies.trim() || null,
      tags: tags.length > 0 ? tags : null,
      bio: bio.trim() || null,
    }

    const { error: err } = await supabase
      .from('roommate_profiles')
      .insert([formData])

    if (err) {
      setError(`SUBMISSION FAILED: ${err.message}`)
      setSubmitting(false)
      return
    }

    router.push('/?submitted=true')
  }

  const canSubmit = name.trim() && contact.trim() && school && !submitting
  const headerBg = school === 'UC Berkeley' ? 'var(--berkeley-blue)' : school === 'Stanford' ? 'var(--stanford-cardinal)' : 'var(--cardinal)'

  return (
    <main className="min-h-screen" style={{ background: 'var(--beige)' }}>
      {/* Header */}
      <div className="border-b-[3px] border-[var(--black)] transition-colors duration-300" style={{ background: headerBg }}>
        <div className="max-w-2xl mx-auto px-6 py-10 relative">
          <div className="ghost-text right-0 top-0 text-[140px]" style={{ color: 'white', opacity: 0.06 }}>DROP</div>
          <Link href="/" className="font-display text-xs tracking-[0.2em] text-white/60 hover:text-white mb-4 inline-block">
            ← BACK
          </Link>
          <h1 className="font-display text-[48px] sm:text-[64px] text-white leading-[0.85]">
            DROP YOUR<br />PROFILE
          </h1>
          <p className="text-xs text-white/60 mt-3">Fill in your habits. Find your match.</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="brutal-container p-6 sm:p-8 space-y-8">

          {/* Section 01: Basic Info */}
          <div className="relative">
            <span className="section-number text-[80px]">01</span>
            <h2 className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2" style={{ color: 'var(--black)' }}>
              BASIC INFO
            </h2>

            <div className="space-y-4">
              <div>
                <label className="font-display text-sm tracking-wider block mb-1" style={{ color: 'var(--mid)' }}>
                  NAME / NICKNAME <span style={{ color: 'var(--cardinal)' }}>*</span>
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="你的姓名或昵称" className="brutal-input" required />
              </div>

              {/* Avatar upload */}
              <div>
                <label className="font-display text-sm tracking-wider block mb-2" style={{ color: 'var(--mid)' }}>
                  PROFILE PHOTO
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <div
                      className="w-20 h-20 border-[3px] border-[var(--black)] flex items-center justify-center overflow-hidden transition-all hover:shadow-[4px_4px_0_var(--gold)]"
                      style={{ background: 'var(--beige)' }}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-display text-2xl" style={{ color: 'var(--mid)' }}>+</span>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--mid)' }}>
                      CLICK TO UPLOAD
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--mid)' }}>
                      JPG / PNG — MAX 2MB
                    </p>
                    {avatarFile && (
                      <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                        className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--cardinal)' }}>
                        REMOVE
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-display text-sm tracking-wider block mb-2" style={{ color: 'var(--mid)' }}>
                  SCHOOL <span style={{ color: 'var(--cardinal)' }}>*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SCHOOL_OPTIONS.map((s) => {
                    const color = s === 'UC Berkeley' ? 'var(--berkeley-blue)' : s === 'Stanford' ? 'var(--stanford-cardinal)' : 'var(--cardinal)'
                    return (
                      <button key={s} type="button" onClick={() => setSchool(school === s ? '' : s)}
                        className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
                        style={school === s ? { background: color, color: 'white', borderColor: color } : {}}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-display text-sm tracking-wider block mb-1" style={{ color: 'var(--mid)' }}>GENDER</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="brutal-select w-full">
                    <option value="">—</option>
                    {GENDER_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
                  </select>
                </div>
                <div>
                  <label className="font-display text-sm tracking-wider block mb-1" style={{ color: 'var(--mid)' }}>YEAR</label>
                  <select value={year} onChange={(e) => { setYear(e.target.value); if (e.target.value !== '新生') setEnrollmentTerm('') }}
                    className="brutal-select w-full">
                    <option value="">—</option>
                    {YEAR_OPTIONS.map((y) => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </div>
              </div>

              {year === '新生' && (
                <div>
                  <label className="font-display text-sm tracking-wider block mb-2" style={{ color: 'var(--mid)' }}>ENROLLMENT TERM</label>
                  <div className="flex gap-2">
                    {ENROLLMENT_OPTIONS.map((term) => (
                      <button key={term} type="button" onClick={() => setEnrollmentTerm(enrollmentTerm === term ? '' : term)}
                        className="brutal-tag cursor-pointer text-xs px-4 py-1.5 transition-colors"
                        style={enrollmentTerm === term ? { background: 'var(--gold)', color: 'var(--black)', borderColor: 'var(--black)' } : {}}>
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="font-display text-sm tracking-wider block mb-1" style={{ color: 'var(--mid)' }}>MAJOR</label>
                <input type="text" value={major} onChange={(e) => setMajor(e.target.value)}
                  placeholder="如：Computer Science, Business" className="brutal-input" />
              </div>

              <div>
                <label className="font-display text-sm tracking-wider block mb-1" style={{ color: 'var(--mid)' }}>
                  CONTACT (WECHAT / PHONE) <span style={{ color: 'var(--cardinal)' }}>*</span>
                </label>
                <input type="text" value={contact} onChange={(e) => setContact(e.target.value)}
                  placeholder="微信号或手机号" className="brutal-input" required />
              </div>
            </div>
          </div>

          {/* Section 02: Habits */}
          <div className="relative">
            <span className="section-number text-[80px]">02</span>
            <h2 className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2" style={{ color: 'var(--black)' }}>
              HABITS
            </h2>
            <div className="space-y-5">
              <RadioGroup label="SLEEP TIME" options={SLEEP_OPTIONS} value={sleepHabit} onChange={setSleepHabit}
                customizable customValue={customSleep} onCustomChange={setCustomSleep} customPlaceholder="如：看情况、不固定、1点左右" />
              <RadioGroup label="CLEANLINESS" options={CLEAN_OPTIONS} value={cleanLevel} onChange={setCleanLevel} />
              <RadioGroup label="NOISE TOLERANCE" options={NOISE_OPTIONS} value={noiseLevel} onChange={setNoiseLevel} />
              <RadioGroup label="MUSIC / SPEAKERS" options={MUSIC_OPTIONS} value={musicHabit} onChange={setMusicHabit} />
              <RadioGroup label="STUDY SPOT" options={STUDY_OPTIONS} value={studyStyle} onChange={setStudyStyle} />
            </div>
          </div>

          {/* Section 03: Hobbies */}
          <div className="relative">
            <span className="section-number text-[80px]">03</span>
            <h2 className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2" style={{ color: 'var(--black)' }}>
              HOBBIES
            </h2>
            <input type="text" value={hobbies} onChange={(e) => setHobbies(e.target.value)}
              placeholder="如：篮球、摄影、弹吉他、看动漫" className="brutal-input" />
          </div>

          {/* Section 04: Tags */}
          <div className="relative">
            <span className="section-number text-[80px]">04</span>
            <h2 className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2" style={{ color: 'var(--black)' }}>
              TAGS
            </h2>
            <div className="flex flex-wrap gap-2">
              {VALID_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
                  style={tags.includes(tag) ? { background: 'var(--cardinal)', color: 'white', borderColor: 'var(--cardinal)' } : {}}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Section 05: Bio */}
          <div className="relative">
            <span className="section-number text-[80px]">05</span>
            <h2 className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2" style={{ color: 'var(--black)' }}>
              BIO
            </h2>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder="简单介绍一下自己（最多200字）" maxLength={200} rows={3}
              className="brutal-input resize-none" />
            <p className="text-[10px] mt-1 text-right uppercase tracking-wider" style={{ color: 'var(--mid)' }}>
              {bio.length}/200
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 border-[3px]" style={{ borderColor: 'var(--cardinal)', background: 'var(--cardinal)', color: 'white' }}>
              <span className="font-display text-sm tracking-wider">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={!canSubmit}
            className={`brutal-btn w-full text-center ${canSubmit ? 'brutal-btn-primary' : ''}`}
            style={!canSubmit ? { background: 'var(--beige)', color: 'var(--mid)', cursor: 'not-allowed' } : {}}>
            {submitting ? 'DROPPING...' : 'DROP MY PROFILE'}
          </button>
        </form>
      </div>
    </main>
  )
}
