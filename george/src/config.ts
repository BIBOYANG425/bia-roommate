// george/src/config.ts
import dotenv from 'dotenv'
dotenv.config()

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  anthropic: {
    apiKey: required('ANTHROPIC_API_KEY'),
  },
  kimi: {
    apiKey: process.env.KIMI_API_KEY || '',
    baseUrl: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
  },
  supabase: {
    url: required('SUPABASE_URL'),
    anonKey: required('SUPABASE_ANON_KEY'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },
  wechat: {
    token: process.env.WECHAT_TOKEN || '',
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
  },
  imessage: {
    enabled: process.env.IMESSAGE_ENABLED === 'true',
  },
  biaRoommate: {
    baseUrl: process.env.BIA_ROOMMATE_API_URL || 'http://localhost:3000',
  },
  apify: {
    token: process.env.APIFY_TOKEN || '',
  },
  adminToken: process.env.ADMIN_TOKEN || '',
  port: parseInt(process.env.PORT || '3001'),
  proactive: {
    enabled: process.env.PROACTIVE_ENABLED !== 'false',
    rolloutPct: parseInt(process.env.PROACTIVE_ROLLOUT_PCT || '10'),
  },
  // Opt-IN (default OFF) — deliberately the opposite of proactive's opt-OUT.
  // The parcels AFTER-UPDATE trigger has been enqueueing real pending rows in
  // prod since 2026-06-06, so ANY george boot with prod creds (including a
  // local `npm run dev`) would otherwise start draining the queue to real
  // students. Set SHIPPING_NOTIFIER_ENABLED=true explicitly to deliver.
  shippingNotifier: {
    enabled: process.env.SHIPPING_NOTIFIER_ENABLED === 'true',
  },
}
