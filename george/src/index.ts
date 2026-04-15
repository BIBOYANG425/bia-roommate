import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { config } from './config.js'
import { createWeChatRouter } from './adapters/wechat.js'
import { startIMessageAdapter } from './adapters/imessage.js'
import { processMessage } from './agent/george.js'
import { getStats, log } from './observability/logger.js'
import { matchStudentsToEvents } from './jobs/proactive.js'
import { sendPendingReminders } from './jobs/reminder-sender.js'
import { scrapeInstagram } from './scrapers/instagram.js'
import { scrapeUSCEvents } from './scrapers/usc-events.js'
import { loadAllSkills, getRegistryStats } from './skills/index.js'
import { getToolDefinitions } from './agent/tool-registry.js'

// Import ALL 15 tools to register them
import './tools/search-events.js'
import './tools/get-event-details.js'
import './tools/campus-knowledge.js'
import './tools/lookup-student.js'
import './tools/search-courses.js'
import './tools/get-course-reviews.js'
import './tools/recommend-courses.js'
import './tools/plan-schedule.js'
import './tools/search-roommates.js'
import './tools/search-sublets.js'
import './tools/post-sublet.js'
import './tools/set-reminder.js'
import './tools/suggest-connection.js'
import './tools/submit-event.js'
import './tools/load-skill.js'

const app = express()
app.use(cors())
app.use(express.text({ type: 'text/xml' }))
app.use(express.json())

// ==========================================
// ROUTES
// ==========================================

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', character: 'George Tirebiter 👻🐕', tools: 15 })
})

app.get('/stats', async (_req, res) => {
  try {
    const stats = await getStats()
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.use(createWeChatRouter())

function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!config.adminToken) return res.status(403).json({ error: 'Admin token not configured' })
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token !== config.adminToken) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

// Dev test console endpoint — runs the full agent team end-to-end.
// Gated by admin token so it isn't open to the public internet.
app.post('/chat', adminAuth, async (req, res) => {
  try {
    const body = req.body as { userId?: string; text?: string; platform?: 'wechat' | 'imessage' }
    if (!body?.text || typeof body.text !== 'string') {
      return res.status(400).json({ error: 'text is required' })
    }
    const response = await processMessage({
      userId: body.userId || 'dev-console',
      platform: body.platform || 'imessage',
      text: body.text,
      msgType: 'text',
      timestamp: Date.now(),
    })
    res.json({ response })
  } catch (err) {
    log('error', 'chat_endpoint_error', { error: (err as Error).message })
    res.status(500).json({ error: (err as Error).message })
  }
})

app.post('/admin/scrape-instagram', adminAuth, async (req, res) => {
  try {
    const accounts = (req.body as { accounts?: string[] })?.accounts
    await scrapeInstagram(accounts)
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.post('/admin/scrape-usc', adminAuth, async (_req, res) => {
  try {
    await scrapeUSCEvents()
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// ==========================================
// BACKGROUND JOBS (cron)
// ==========================================

cron.schedule('0 */3 * * *', () => {
  matchStudentsToEvents().catch((err) => {
    log('error', 'proactive_cron_error', { error: err.message })
  })
})

cron.schedule('*/5 * * * *', () => {
  sendPendingReminders().catch((err) => {
    log('error', 'reminder_cron_error', { error: err.message })
  })
})

cron.schedule('0 */4 * * *', () => {
  scrapeInstagram().catch((err) => {
    log('error', 'instagram_cron_error', { error: err.message })
  })
})

cron.schedule('0 6 * * *', () => {
  scrapeUSCEvents().catch((err) => {
    log('error', 'usc_cron_error', { error: err.message })
  })
})

// ==========================================
// PROCESS RESILIENCE
// ==========================================

process.on('uncaughtException', (err) => {
  log('error', 'uncaught_exception', { error: err.message, stack: err.stack })
})

process.on('unhandledRejection', (reason) => {
  log('error', 'unhandled_rejection', { reason: String(reason) })
})

function shutdown(signal: string) {
  log('info', 'shutdown', { signal })
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// ==========================================
// START
// ==========================================

async function startServer() {
  try {
    const toolNames = new Set(getToolDefinitions().map((t) => t.name))
    await loadAllSkills(toolNames)
    log('info', 'skill_registry_loaded', getRegistryStats())
  } catch (err) {
    log('error', 'skill_registry_load_failed', { error: (err as Error).message })
    throw err
  }

  app.listen(config.port, () => {
    log('info', 'server_started', {
      port: config.port,
      tools: 15,
      proactive: config.proactive.enabled,
      rolloutPct: config.proactive.rolloutPct,
    })
    console.log(`\n🐕 George Tirebiter is haunting port ${config.port}...`)
    console.log(`👻 WeChat: http://localhost:${config.port}/wechat`)
    console.log(`📊 Stats: http://localhost:${config.port}/stats`)
    console.log(`🔧 Admin: POST /admin/scrape-instagram, /admin/scrape-usc\n`)
  })

  startIMessageAdapter().catch((err) => {
    log('warn', 'imessage_start_failed', { error: err.message })
    console.warn('⚠️  iMessage adapter failed to start — George will only haunt WeChat.')
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
