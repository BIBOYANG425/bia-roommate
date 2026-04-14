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
    serverUrl: process.env.IMESSAGE_SERVER_URL || 'http://localhost:1234',
    apiKey: process.env.IMESSAGE_API_KEY || '',
  },
  biaRoommate: {
    baseUrl: process.env.BIA_ROOMMATE_API_URL || 'http://localhost:3000',
  },
  apify: {
    token: process.env.APIFY_TOKEN || '',
  },
  port: parseInt(process.env.PORT || '3001'),
  proactive: {
    enabled: process.env.PROACTIVE_ENABLED !== 'false',
    rolloutPct: parseInt(process.env.PROACTIVE_ROLLOUT_PCT || '10'),
  },
}
