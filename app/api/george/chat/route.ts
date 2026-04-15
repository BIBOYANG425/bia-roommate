import { NextRequest, NextResponse } from 'next/server'

// Forwards test-console chat requests to the George backend (Express, port 3001).
// The backend runs the full multi-agent architecture (intent classifier → sub-agent → tools).
// Calling the Anthropic API directly from here would skip the tool-use loop, and George
// would hallucinate events instead of querying Supabase.

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.GEORGE_BACKEND_URL || 'http://localhost:3001'
  const adminToken = process.env.GEORGE_ADMIN_TOKEN

  if (!adminToken) {
    return NextResponse.json(
      { error: 'GEORGE_ADMIN_TOKEN not configured in .env.local' },
      { status: 500 },
    )
  }

  const body = (await req.json()) as {
    message: string
    history?: ChatMessage[]
    userId?: string
  }
  const { message, userId } = body

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // The backend pulls history from Supabase keyed on userId, so we don't forward `history`
  // from the client — we rely on server-side conversation state. The test console passes
  // a stable userId to keep the conversation coherent across turns.
  const res = await fetch(`${backendUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      userId: userId || 'dev-console',
      platform: 'imessage',
      text: message,
    }),
  }).catch((err) => {
    return new Response(
      JSON.stringify({ error: `backend unreachable: ${err.message}` }),
      { status: 502 },
    )
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json(
      { error: `george backend error ${res.status}: ${err.slice(0, 200)}` },
      { status: 502 },
    )
  }

  const data = (await res.json()) as { response?: string; error?: string }
  return NextResponse.json({ response: data.response ?? data.error ?? '' })
}
