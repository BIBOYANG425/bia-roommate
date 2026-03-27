'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { RoommateProfile, GENDER_OPTIONS, YEAR_OPTIONS, SCHOOL_OPTIONS } from '@/lib/types'
import ProfileCard from '@/components/ProfileCard'
import ProfileModal from '@/components/ProfileModal'
import SkeletonCard from '@/components/SkeletonCard'
import Toast from '@/components/Toast'
import NavTabs from '@/components/NavTabs'

function Marquee({ bg, text, items }: { bg: string; text: string; items: string[] }) {
  const content = items.join('  //  ') + '  //  '
  return (
    <div className="overflow-hidden border-y-[3px] border-[var(--black)]" style={{ background: bg, color: text }}>
      <div className="marquee-track py-2">
        <span className="font-display text-sm tracking-[0.15em] whitespace-nowrap px-4">{content}</span>
        <span className="font-display text-sm tracking-[0.15em] whitespace-nowrap px-4">{content}</span>
      </div>
    </div>
  )
}

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [profiles, setProfiles] = useState<RoommateProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<RoommateProfile | null>(null)

  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  useEffect(() => {
    if (searchParams.get('submitted') === 'true') {
      setShowToast(true)
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('roommate_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) {
      setError('LOAD FAILED — RETRY')
      setLoading(false)
      return
    }
    setProfiles(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const filtered = profiles.filter((p) => {
    if (schoolFilter && p.school !== schoolFilter) return false
    if (genderFilter && p.gender !== genderFilter) return false
    if (yearFilter && p.year !== yearFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matchName = p.name.toLowerCase().includes(q)
      const matchMajor = p.major?.toLowerCase().includes(q)
      const matchTags = p.tags?.some((t) => t.toLowerCase().includes(q))
      const matchHobbies = p.hobbies?.toLowerCase().includes(q)
      if (!matchName && !matchMajor && !matchTags && !matchHobbies) return false
    }
    return true
  })

  // School-specific theme colors
  const themeAccent = schoolFilter === 'UC Berkeley' ? 'var(--berkeley-blue)'
    : schoolFilter === 'Stanford' ? 'var(--stanford-cardinal)'
    : 'var(--cardinal)'
  const themeGold = schoolFilter === 'UC Berkeley' ? 'var(--berkeley-gold)'
    : schoolFilter === 'Stanford' ? 'var(--stanford-gold)'
    : 'var(--gold)'

  return (
    <main className="min-h-screen">
      {showToast && <Toast message="PROFILE DROPPED SUCCESSFULLY" onClose={() => setShowToast(false)} />}

      {/* Nav */}
      <NavTabs />

      {/* Top Marquee */}
      <Marquee
        bg={themeAccent}
        text={themeGold}
        items={['BIA 新生找室友', 'FIND YOUR ROOMMATE', 'CLASS OF 2030', 'NEW DROP', 'USC ✕ BERKELEY ✕ STANFORD', 'ROOMMATE MATCH']}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b-[3px] border-[var(--black)]" style={{ background: 'var(--cream)' }}>
        <div className="ghost-text -left-4 top-1/2 -translate-y-1/2">ROOMMATE</div>
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 relative">
          <div className="flex items-center gap-6 mb-8">
            <Image
              src="/logo.jpg"
              alt="BIA Class of 2030"
              width={100}
              height={100}
              className="border-[3px] border-[var(--black)]"
              style={{ boxShadow: `6px 6px 0 ${themeAccent}` }}
            />
            <div>
              <div className="new-drop-badge mb-2">NEW DROP 2030</div>
              <p className="font-display text-sm" style={{ color: 'var(--mid)' }}>BIA ROOMMATE MATCH</p>
            </div>
          </div>

          <h1 className="font-display text-[60px] sm:text-[96px] leading-[0.85] mb-6" style={{ color: 'var(--black)' }}>
            BIA 新生<br />
            <span className="glitch-text" style={{ color: themeAccent }}>找室友</span>
          </h1>

          <p className="text-sm sm:text-base max-w-md mb-10" style={{ color: 'var(--mid)' }}>
            填写你的生活习惯，找到最合拍的室友。<br />
            Drop your profile. Find your match.
          </p>

          <Link href="/submit" className="brutal-btn brutal-btn-primary inline-block">
            DROP MY PROFILE →
          </Link>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-6 py-8 relative">
        <span className="section-number">01</span>
        <h2 className="font-display text-[40px] sm:text-[60px] mb-6" style={{ color: 'var(--black)' }}>BROWSE</h2>

        {/* Campus Tabs */}
        <div className="flex gap-0 mb-6 flex-wrap">
          {['', 'USC', 'UC Berkeley', 'Stanford'].map((s) => {
            const active = schoolFilter === s
            const label = s || 'ALL'
            let bg = 'var(--cream)'
            let fg = 'var(--mid)'
            if (active) {
              if (s === 'UC Berkeley') { bg = 'var(--berkeley-blue)'; fg = 'white' }
              else if (s === 'Stanford') { bg = 'var(--stanford-cardinal)'; fg = 'white' }
              else if (s === 'USC') { bg = 'var(--cardinal)'; fg = 'white' }
              else { bg = 'var(--black)'; fg = 'white' }
            }
            return (
              <button
                key={label}
                onClick={() => setSchoolFilter(s)}
                className="font-display text-sm sm:text-base tracking-[0.1em] px-5 sm:px-8 py-3 border-[3px] border-[var(--black)] -mr-[3px] first:mr-0 transition-colors"
                style={{ background: bg, color: fg }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="SEARCH NAME / MAJOR / TAGS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="brutal-input flex-1"
          />
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="brutal-select"
          >
            <option value="">ALL GENDERS</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="brutal-select"
          >
            <option value="">ALL YEARS</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="font-display text-2xl" style={{ color: 'var(--cardinal)' }}>{error}</p>
            <button onClick={fetchProfiles} className="brutal-btn brutal-btn-gold mt-6">
              RETRY
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 relative">
            <div className="ghost-text left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px]">EMPTY</div>
            <h3 className="font-display text-3xl mb-3 relative" style={{ color: 'var(--black)' }}>
              {profiles.length === 0 ? 'NO PROFILES YET' : 'NO MATCHES'}
            </h3>
            <p className="text-sm mb-6 relative" style={{ color: 'var(--mid)' }}>
              {profiles.length === 0 ? 'Be the first to drop your profile.' : 'Try adjusting your filters.'}
            </p>
            {profiles.length === 0 && (
              <Link href="/submit" className="brutal-btn brutal-btn-primary inline-block relative">
                DROP PROFILE
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs mb-4" style={{ color: 'var(--mid)', fontFamily: 'var(--font-body)' }}>
              {filtered.length} PROFILES FOUND
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((profile, i) => (
                <div key={profile.id} className="reveal" style={{ animationDelay: `${i * 0.05}s` }}>
                  <ProfileCard profile={profile} onClick={() => setSelectedProfile(profile)} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Bottom Marquee */}
      <Marquee
        bg={themeGold}
        text={themeAccent}
        items={['CLASS OF 2030', 'FIGHT ON', 'GO BEARS', 'GO CARDINAL', 'BIA', 'ROOMMATE MATCH', 'DROP YOUR PROFILE']}
      />

      {/* Social Links */}
      <section className="border-t-[3px] border-[var(--black)] py-8 px-6" style={{ background: 'var(--cream)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="https://www.instagram.com/bia_usc/"
            target="_blank"
            rel="noopener noreferrer"
            className="brutal-btn brutal-btn-ghost text-sm flex items-center gap-2"
          >
            <span>INSTAGRAM</span>
            <span style={{ color: themeAccent }}>@BIA_USC</span>
            <span style={{ color: 'var(--mid)', fontSize: '10px' }}>→</span>
          </a>
          <a
            href="https://xhslink.com/m/2t4EzpZAKAc"
            target="_blank"
            rel="noopener noreferrer"
            className="brutal-btn brutal-btn-ghost text-sm flex items-center gap-2"
          >
            <span style={{ color: themeAccent }}>小红书</span>
            <span className="new-drop-badge" style={{ fontSize: '9px', padding: '1px 6px' }}>4138 LIKES</span>
            <span style={{ color: 'var(--mid)', fontSize: '10px' }}>→</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 text-center border-t-[3px] border-[var(--black)]">
        <p className="font-display text-xs tracking-[0.2em]" style={{ color: 'var(--mid)' }}>
          BIA 新生找室友 — EXCLUSIVE TO BIA FRESHMEN
        </p>
      </footer>

      {/* Detail Modal */}
      {selectedProfile && (
        <ProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
      )}
    </main>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
