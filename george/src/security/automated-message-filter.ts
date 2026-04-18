/**
 * Detects automated / third-party / enterprise messages that leak into George's
 * inbox — meeting invites, OTP codes, newsletters, transactional receipts,
 * LinkedIn InMail, etc. These are never from a real student, so George should
 * silently drop them: no reply, no DB writes, no onboarding flow.
 *
 * Runs before student resolution in processMessage() so spam doesn't create
 * student rows or trigger the 4-field profile flow.
 *
 * Patterns err on the side of precision over recall — false negatives (real
 * automation sneaks through and George replies awkwardly once) are cheaper
 * than false positives (silently ignoring a genuine student message). If a
 * pattern ever lights up for a real user, narrow it — don't widen the net.
 *
 * Header last reviewed: 2026-04-17
 */
import { log } from '../observability/logger.js'

export interface AutomatedNoiseCheck {
  isNoise: boolean
  rule?: string
}

// Each rule has an id so matches are auditable in logs. Groups:
//  1. Calendar / meeting invites (Zoom, Teams, Google Meet, Luma, Cal.com…)
//  2. OTP / verification codes
//  3. Newsletter / marketing / transactional footers
//  4. LinkedIn / enterprise SaaS blast patterns
const RULES: Array<{ id: string; rx: RegExp }> = [
  // --- 1. Meeting invites ---
  // "X invited you to …" — the canonical calendar-invite opener. "you"
  // referring to George (not to a third party) + "invited" is a high-precision
  // automation signal; a student writing to George wouldn't phrase it this way.
  // Kept lenient on what follows so "invited you to Antler AgentsMeet",
  // "invited you to their board", and "has invited you to edit this doc" all
  // hit the same rule.
  { id: 'invite_invited_you_to', rx: /\b(has\s+)?invited\s+you\s+to\b/i },
  // Generic "You're invited to … meeting / call / event" variant.
  { id: 'invite_youre_invited', rx: /\byou'?re\s+invited\s+to\s+(join\s+)?(a\s+)?(meeting|call|event|webinar)/i },
  // Microsoft Teams: "Microsoft Teams meeting" header.
  { id: 'invite_teams', rx: /\bMicrosoft\s+Teams\s+meeting\b/i },
  // Google Calendar invite reply prompts ("Yes / Maybe / No — More options").
  { id: 'invite_gcal_rsvp', rx: /\bMore\s+options\b\s*$/im },
  // Direct Zoom / Meet / Teams / Luma / Cal.com join URLs — if a message is
  // almost exclusively a meeting link it's probably a forwarded invite.
  { id: 'invite_zoom_link', rx: /\bzoom\.us\/j\/\d+/i },
  { id: 'invite_meet_link', rx: /\bmeet\.google\.com\/[a-z0-9-]+/i },
  { id: 'invite_teams_link', rx: /\bteams\.microsoft\.com\/l\/meetup-join\//i },
  { id: 'invite_luma_link', rx: /\blu\.ma\/[a-z0-9-]+/i },
  { id: 'invite_calcom_link', rx: /\bcal\.com\/[a-z0-9-]+/i },
  { id: 'invite_gcal_event', rx: /\bcalendar\.google\.com\/event\?/i },
  { id: 'invite_calendar_invitation', rx: /\bcalendar\s+invitation\b/i },

  // --- 2. Verification / OTP codes ---
  { id: 'otp_is_your_code', rx: /\b\d{4,8}\s+is\s+your\s+(verification|login|sign[-\s]?in|one[-\s]?time|access)\s+code\b/i },
  // "Your <thing> code is 123456" — <thing> can be a product name (Hinge,
  // Uber, Google…) or a code-type word (verification, login, one-time…).
  // Also accepts "Your code is 123456" with no modifier at all.
  { id: 'otp_your_code_is', rx: /\byour(\s+[\w-]{2,24}){0,3}\s+(code|password|pin)\s+is[:\s]+[\w\d-]{4,10}/i },
  { id: 'otp_zh_yanzhengma', rx: /验证码[:：]?\s*[A-Z0-9]{4,8}/ },
  { id: 'otp_do_not_share', rx: /\bdo\s+not\s+share\s+(this|your)\s+(code|pin|otp)/i },
  // Chinese commercial SMS: "【品牌】..." bracket prefix is the canonical
  // 短信 tell. Real WeChat / iMessage users almost never start a message
  // with a bracketed brand name.
  { id: 'zh_bracket_brand', rx: /^\s*【[^】\n]{2,20}】/ },
  // Chinese promo red-envelope CTA without bracket prefix (covers SMS
  // continuations where the brand header was truncated upstream).
  { id: 'zh_red_envelope', rx: /红包.{0,15}(待使用|待领取|立即(领取|使用)|速领|仅限\s*\d+\s*(天|小时))/ },

  // --- 2b. US marketing SMS (CTIA / TCPA-required opt-out language) ---
  // Every legitimate US marketing SMS MUST include opt-out copy. These three
  // variants catch ~all of it and almost never appear in real student text.
  { id: 'sms_reply_stop', rx: /\b(reply|text)\s+STOP\b/i },
  { id: 'sms_stop_to_opt', rx: /\bSTOP\s+to\s+(opt[-\s]?out|unsubscribe|cancel|end)\b/i },
  // Toll-free brand prefix + colon at the start of the message (with optional
  // leading object-replacement char from iMessage). Catches "1-800 Contacts:
  // …", "855-ACNE-RX: …", "833-FinServ: …" — a format unique to bulk SMS.
  { id: 'sms_tollfree_prefix', rx: /^[\uFFFC\s]*1?[-\s]?8(?:00|33|44|55|66|77|88)[\s-]?[A-Z0-9][\w\s&.'-]{1,30}:\s+\w/i },

  // --- 2c. Promotional / gift-marketing openers ---
  // Phrases a real student writing to George would never use. Kept tight:
  // no "free trial" or "sale" rules — those can appear in legit conversation
  // ("our gym has a free trial"). These three are commercial-SMS-specific.
  { id: 'promo_gift_of', rx: /\b(share|give|send|gift)\s+(the\s+)?gift\s+of\s+\w/i },
  { id: 'promo_percent_off_cta', rx: /\b\d{1,2}%\s+off\s+(your|all|every|today|first|next|any|select)\b/i },
  { id: 'promo_limited_time', rx: /\b(limited[-\s]time\s+(offer|only|deal)|offer\s+expires|exclusive\s+(deal|offer)|act\s+now\s+to\s+save)\b/i },

  // --- 3. Marketing / transactional footers ---
  { id: 'footer_unsubscribe', rx: /\bunsubscribe\s+(from|here|at)\b/i },
  { id: 'footer_view_in_browser', rx: /\bview\s+(this\s+email\s+)?in\s+(your\s+)?browser\b/i },
  { id: 'footer_automated', rx: /\bthis\s+is\s+an?\s+automated\s+(message|email|notification|reminder)/i },
  { id: 'footer_do_not_reply', rx: /\b(please\s+)?do\s+not\s+reply\s+to\s+this\s+(email|message|automated)/i },
  { id: 'footer_noreply_addr', rx: /\bno[-\s]?reply@[\w.-]+/i },
  { id: 'footer_manage_prefs', rx: /\bmanage\s+(your\s+)?(email\s+|notification\s+)?preferences\b/i },

  // --- 4. LinkedIn / enterprise SaaS ---
  { id: 'linkedin_inmail', rx: /\bLinkedIn\s+InMail\b/i },
  { id: 'linkedin_view_on', rx: /\bview\s+(this\s+|full\s+)?(message|profile|conversation)\s+on\s+LinkedIn\b/i },
  { id: 'linkedin_sent_message', rx: /\bsent\s+you\s+a\s+message\s+on\s+LinkedIn\b/i },
  // Client portal / SaaS welcome + new-message blasts (Filevine, ShareFile,
  // Intuit, HubSpot, legal/accounting client portals).
  { id: 'portal_welcome', rx: /\bwelcome\s+[\w]+\s+to\s+(your\s+)?(client\s+)?portal\b/i },
  { id: 'portal_new_message', rx: /\byou\s+have\s+(a\s+)?new\s+message\s+from\b/i },
  { id: 'portal_client_portal_url', rx: /\bclientportal\.[\w.-]+\//i },
  { id: 'saas_sent_you_doc', rx: /\bsent\s+you\s+a\s+(doc|document|file|link)\s+(via|through|on)\s+(Notion|Google\s+Docs?|Dropbox|Asana|Figma|Slack)\b/i },

  // --- 4b. Marketplace / gig-economy rating & review blasts ---
  // "<name> (really) enjoyed working with you & rated you 5 stars" is the
  // canonical Upwork/Fiverr/Lyft/Uber/DoorDash review-notification pattern.
  { id: 'review_enjoyed_working', rx: /\b(really\s+)?enjoyed\s+working\s+with\s+you\s+(&|and)\s+rated\s+you/i },
  { id: 'review_new_review_from', rx: /\byou('?ve)?\s+(got|received)\s+a\s+(new\s+)?(review|rating)\s+from\b/i },
  { id: 'review_rate_your_exp', rx: /\brate\s+your\s+(recent\s+)?(experience|trip|ride|order|delivery)\b/i },
  { id: 'review_left_a_review', rx: /\bleft\s+you\s+an?\s+(review|rating|\d[-\s]?star)/i },
  { id: 'review_you_got_n_stars', rx: /\byou\s+(got|received|earned)\s+\d\s+stars?\b/i },
  // Appointment / service-completion notifications (TaskRabbit, Thumbtack,
  // Angi, DoorDash Courier, Rover, Handy…). "<Name> completed your <thing>"
  // with a date or service noun — narrow so it doesn't catch casual chat.
  { id: 'marketplace_completion', rx: /\b\w+\s+completed\s+your\s+(?:[\w\s,.-]{0,40}\s+)?(appointment|ride|trip|delivery|order|booking|cleaning|task)\b/i },
  { id: 'marketplace_how_was_exp', rx: /\bhow\s+was\s+your\s+(recent\s+)?(experience|trip|ride|stay|order)\s+with\b/i },

  // --- 5. Order / payment receipts ---
  { id: 'receipt_order_confirmation', rx: /\border\s+(confirmation|#\d{4,})/i },
  { id: 'receipt_payment', rx: /\b(payment|receipt)\s+(received|from)\b.*\bamount\b/i },
  { id: 'receipt_subscription_renewed', rx: /\byour\s+subscription\s+has\s+been\s+(renewed|charged)/i },
]

export function checkAutomatedNoise(text: string, ctx?: { userId?: string; platform?: string }): AutomatedNoiseCheck {
  for (const rule of RULES) {
    if (rule.rx.test(text)) {
      log('info', 'automated_message_filtered', {
        rule: rule.id,
        userId: ctx?.userId,
        platform: ctx?.platform,
        snippet: text.slice(0, 100),
      })
      return { isNoise: true, rule: rule.id }
    }
  }
  return { isNoise: false }
}
