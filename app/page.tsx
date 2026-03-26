'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { RoommateProfile, GENDER_OPTIONS, YEAR_OPTIONS, SCHOOL_OPTIONS } from '@/lib/types'
import ProfileCard from '@/components/ProfileCard'
import ProfileModal from '@/components/ProfileModal'
import SkeletonCard from '@/components/SkeletonCard'
import Toast from '@/components/Toast'

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
      setError('加载失败，请稍后再试')
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

  return (
    <main className="min-h-screen">
      {showToast && <Toast message="资料已发布！" onClose={() => setShowToast(false)} />}

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-700 to-emerald-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">BIA 新生找室友</h1>
          <p className="text-green-100 mb-8 text-lg">填写你的生活习惯，找到最合拍的室友</p>
          <Link
            href="/submit"
            className="inline-block bg-white text-green-700 font-semibold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors"
          >
            填写我的资料 →
          </Link>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-5xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="搜索姓名、专业、标签、爱好..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">全部学校</option>
            {SCHOOL_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">全部性别</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">全部年级</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Profile Grid */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-stone-500 text-lg">{error}</p>
            <button
              onClick={fetchProfiles}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 transition-colors"
            >
              重试
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-lg font-semibold text-stone-700 mb-2">
              {profiles.length === 0 ? '还没有人填写资料' : '没有匹配的结果'}
            </h3>
            <p className="text-stone-500 mb-6">
              {profiles.length === 0
                ? '成为第一个填写资料的同学吧！'
                : '试试调整筛选条件'}
            </p>
            {profiles.length === 0 && (
              <Link
                href="/submit"
                className="inline-block bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
              >
                填写资料
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-500 mb-4">共 {filtered.length} 位同学</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} onClick={() => setSelectedProfile(profile)} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-stone-400 border-t border-stone-200 mt-auto">
        BIA 新生找室友 · 仅供 BIA 新生群使用
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
