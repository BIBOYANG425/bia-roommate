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
      <label className="block text-sm font-medium text-stone-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
              value === opt
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-stone-700 border-stone-200 hover:border-green-400'
            }`}
          >
            {opt}
          </button>
        ))}
        {customizable && (
          <button
            type="button"
            onClick={() => onChange(isCustom ? '' : '__custom__')}
            className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
              isCustom
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-stone-700 border-stone-200 hover:border-green-400'
            }`}
          >
            自定义
          </button>
        )}
      </div>
      {isCustom && (
        <input
          type="text"
          value={customValue || ''}
          onChange={(e) => onCustomChange?.(e.target.value)}
          placeholder={customPlaceholder || '输入自定义内容'}
          className="mt-2 w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !contact.trim()) return

    setSubmitting(true)
    setError(null)

    const finalSleep = sleepHabit === '__custom__' ? (customSleep.trim() || null) : (sleepHabit || null)

    const formData = {
      name: name.trim(),
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
      setError('提交失败，请稍后再试')
      setSubmitting(false)
      return
    }

    router.push('/?submitted=true')
  }

  const canSubmit = name.trim() && contact.trim() && !submitting

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-700 to-emerald-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <Link href="/" className="text-green-200 hover:text-white text-sm mb-4 inline-block">
            ← 返回首页
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">填写我的资料</h1>
          <p className="text-green-100 mt-2">填写你的生活习惯，让同学更了解你</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 -mt-4 pb-12">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6"
        >
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-stone-800 pb-2 border-b border-stone-100">
              基本信息
            </h2>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                姓名 / 昵称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入你的姓名或昵称"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">性别</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">不填</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">年级</label>
                <select
                  value={year}
                  onChange={(e) => { setYear(e.target.value); if (e.target.value !== '新生') setEnrollmentTerm('') }}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">不填</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Enrollment term — only for 新生 */}
            {year === '新生' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">入学时间</label>
                <div className="flex gap-2">
                  {ENROLLMENT_OPTIONS.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setEnrollmentTerm(enrollmentTerm === term ? '' : term)}
                      className={`px-5 py-2 rounded-xl text-sm border transition-colors ${
                        enrollmentTerm === term
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-green-400'
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">专业</label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="如：计算机科学、商务管理"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                联系方式（微信/手机）<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="输入微信号或手机号"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Living Habits */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-stone-800 pb-2 border-b border-stone-100">
              生活习惯
            </h2>
            <RadioGroup
              label="睡眠时间"
              options={SLEEP_OPTIONS}
              value={sleepHabit}
              onChange={setSleepHabit}
              customizable
              customValue={customSleep}
              onCustomChange={setCustomSleep}
              customPlaceholder="如：看情况、不固定、1点左右"
            />
            <RadioGroup label="整洁程度" options={CLEAN_OPTIONS} value={cleanLevel} onChange={setCleanLevel} />
            <RadioGroup label="噪音接受度" options={NOISE_OPTIONS} value={noiseLevel} onChange={setNoiseLevel} />
            <RadioGroup label="听歌/外放习惯" options={MUSIC_OPTIONS} value={musicHabit} onChange={setMusicHabit} />
            <RadioGroup label="学习地点" options={STUDY_OPTIONS} value={studyStyle} onChange={setStudyStyle} />
          </div>

          {/* Hobbies */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-stone-800 pb-2 border-b border-stone-100">
              兴趣爱好
            </h2>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                你的兴趣爱好
              </label>
              <input
                type="text"
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
                placeholder="如：篮球、摄影、弹吉他、看动漫"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-stone-800 pb-2 border-b border-stone-100">
              个性标签
            </h2>
            <div className="flex flex-wrap gap-2">
              {VALID_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    tags.includes(tag)
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-green-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <h2 className="text-lg font-semibold text-stone-800 pb-2 border-b border-stone-100 mb-4">
              自我介绍
            </h2>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="简单介绍一下自己，让室友更了解你（最多200字）"
              maxLength={200}
              rows={3}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-stone-400 mt-1 text-right">{bio.length}/200</p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
              canSubmit
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            {submitting ? '提交中...' : '发布我的资料'}
          </button>
        </form>
      </div>
    </main>
  )
}
