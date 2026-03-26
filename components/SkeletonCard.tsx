export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-stone-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-stone-200 rounded w-20" />
          <div className="h-3 bg-stone-100 rounded w-32" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="h-5 bg-stone-100 rounded-full w-14" />
        <div className="h-5 bg-stone-100 rounded-full w-16" />
        <div className="h-5 bg-stone-100 rounded-full w-12" />
      </div>
      <div className="space-y-2">
        <div className="h-1.5 bg-stone-100 rounded-full" />
        <div className="h-1.5 bg-stone-100 rounded-full" />
        <div className="h-1.5 bg-stone-100 rounded-full" />
      </div>
      <div className="h-8 bg-stone-100 rounded" />
      <div className="pt-2 border-t border-stone-100 flex justify-between">
        <div className="h-4 bg-stone-200 rounded w-28" />
        <div className="h-3 bg-stone-100 rounded w-16" />
      </div>
    </div>
  )
}
