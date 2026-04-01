import { NextRequest } from 'next/server'
import { runAgentStreaming, type AgentEvent } from '@/lib/course-planner/agent'
import { corsHeaders, handleOptions } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request) ?? new Response(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request)

  try {
    const body = await request.json()
    const { interests, semester, units, thinking } = body ?? {}

    if (typeof interests !== 'string' || interests.trim().length < 2) {
      return Response.json({ error: 'Please describe your interests' }, { status: 400, headers: cors })
    }

    const hasLLMKey = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.NVIDIA_API_KEY)
    if (!hasLLMKey) {
      return Response.json({ error: 'AI search is not configured' }, { status: 503, headers: cors })
    }

    const baseUrl = request.nextUrl.origin
    const semesterCode = typeof semester === 'string' && semester ? semester : '20263'
    const unitsFilter = typeof units === 'string' ? units : undefined

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        function emit(event: AgentEvent) {
          const data = JSON.stringify(event)
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }

        try {
          await runAgentStreaming(interests, semesterCode, baseUrl, unitsFilter, !!thinking, emit)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          emit({ type: 'error', message: msg })
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        ...cors,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[agent-stream] Failed:', err)
    return Response.json({ error: 'Failed to start agent' }, { status: 500, headers: cors })
  }
}
