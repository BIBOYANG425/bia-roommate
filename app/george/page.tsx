'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

import './george-chat.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    '汪！👻 你居然能看到我？！我是George Tirebiter，USC最有名的幽灵狗🐕\n\n我在这个校园游荡了快80年了，没什么是我不知道的。\n\n想知道最近有什么好活动？问我就行！',
}

export default function GeorgeChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
    // Stable userId across reloads so Supabase-backed conversation history stays coherent.
    const stored = window.localStorage.getItem('george-dev-user-id')
    if (stored) {
      setUserId(stored)
    } else {
      const fresh = `dev-${crypto.randomUUID()}`
      window.localStorage.setItem('george-dev-user-id', fresh)
      setUserId(fresh)
    }
  }, [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/george/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, userId }),
      })

      const data = await res.json()
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.response || data.error || '哎呀，我穿墙卡住了...',
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: '哎呀，我刚从图书馆穿墙的时候撞到头了... 再试一次？👻',
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages, userId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="gc-page">
      {/* Header */}
      <div className="gc-header">
        <a href="/" className="gc-back">&larr; Back</a>
        <div className="gc-title-row">
          <h1 className="font-display gc-title">GEORGE</h1>
          <span className="gc-subtitle">DEV TEST CONSOLE</span>
        </div>
        <div className="gc-divider" />
      </div>

      {/* Chat container */}
      <div className="gc-container brutal-container">
        {/* Messages */}
        <div className="gc-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`gc-msg-row ${msg.role === 'user' ? 'gc-msg-row--user' : ''}`}
            >
              <div className={`gc-bubble ${msg.role === 'user' ? 'gc-bubble--user' : 'gc-bubble--george'}`}>
                {msg.role === 'assistant' && (
                  <div className="gc-sender">GEORGE 👻🐕</div>
                )}
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="gc-msg-row">
              <div className="gc-bubble gc-bubble--george">
                <div className="gc-sender">GEORGE 👻🐕</div>
                <span className="glitch-text">穿墙中...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Divider */}
        <div className="gc-divider" />

        {/* Input */}
        <div className="gc-input-row">
          <textarea
            ref={inputRef}
            className="gc-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="跟George说点什么..."
            disabled={loading}
            rows={1}
          />
          <button
            className={`gc-send ${loading || !input.trim() ? 'gc-send--disabled' : ''}`}
            onClick={send}
            disabled={loading || !input.trim()}
          >
            {loading ? '...' : 'SEND'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="gc-footer">
        <span>Model: Claude Sonnet 4.6</span>
        <span>Personality: Ghost Dog ENTP</span>
        <span>API: /api/george/chat</span>
      </div>
    </div>
  )
}
