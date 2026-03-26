'use client'

import { useEffect, useState } from 'react'

export default function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 border-[3px] border-[var(--black)] font-display text-sm tracking-wider transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
      style={{ background: 'var(--gold)', color: 'var(--black)', boxShadow: '4px 4px 0 var(--black)' }}
    >
      {message}
    </div>
  )
}
