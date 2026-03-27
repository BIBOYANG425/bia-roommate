const AVATAR_COLORS = [
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
  'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
  'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500',
  'bg-amber-500', 'bg-orange-500',
]

export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getLastChar(name: string): string {
  return name.charAt(name.length - 1)
}

export function relativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

export function habitLevel(
  value: string | null,
  options: readonly string[]
): number {
  if (!value) return 0
  const idx = options.indexOf(value)
  return idx === -1 ? 0 : ((idx + 1) / options.length) * 100
}

export function isBerkeley(school: string | null): boolean {
  return school === 'UC Berkeley'
}

export function schoolAccent(school: string | null): string {
  return isBerkeley(school) ? 'var(--berkeley-blue)' : 'var(--cardinal)'
}
