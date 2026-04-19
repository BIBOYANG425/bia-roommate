import { describe, it, expect, vi } from 'vitest'
import { checkAutomatedNoise } from '../../src/security/automated-message-filter.js'

vi.mock('../../src/observability/logger.js', () => ({ log: vi.fn() }))

describe('checkAutomatedNoise — blocks automation', () => {
  const blocked: Array<[string, string]> = [
    // meeting invites — the original leak
    ['Walnut AI invited you to Antler AgentsMeet: Virtual Demo Day', 'invite_invited_you_to'],
    ['Jane Doe has invited you to a meeting', 'invite_invited_you_to'],
    ["You're invited to a webinar on Friday", 'invite_youre_invited'],
    ['Microsoft Teams meeting\nJoin on your computer…', 'invite_teams'],
    ['Join Zoom Meeting https://zoom.us/j/12345678901', 'invite_zoom_link'],
    ['Join here: https://meet.google.com/abc-defg-hij', 'invite_meet_link'],
    ['RSVP at https://lu.ma/founder-mixer', 'invite_luma_link'],
    ['Book a slot: cal.com/boyang/30min', 'invite_calcom_link'],
    ['Calendar invitation: Weekly sync', 'invite_calendar_invitation'],
    // OTP / verification
    ['123456 is your verification code', 'otp_is_your_code'],
    ['Your login code is: 8492', 'otp_your_code_is'],
    ['Your Hinge code is 371696', 'otp_your_code_is'],
    ['Your Uber verification code is 9174', 'otp_your_code_is'],
    ['Your code is 384920', 'otp_your_code_is'],
    ['验证码：482913', 'otp_zh_yanzhengma'],
    ['【熊猫外卖】您有 $13专属红包待使用。仅限1天，速领速用 👉https://hungrypanda.xyz/abc', 'zh_bracket_brand'],
    ['【京东】双十一大促提前享，满299减50', 'zh_bracket_brand'],
    ['您有 $13专属红包待使用，仅限1天', 'zh_red_envelope'],
    ['Do not share this code with anyone', 'otp_do_not_share'],
    // Promotional / gift-marketing openers (the actual live leak)
    ['Share the gift of having a clean home to your loved ones', 'promo_gift_of'],
    ['Give the gift of a Spotify subscription', 'promo_gift_of'],
    ['Save 20% off your first order today', 'promo_percent_off_cta'],
    ['15% off every order until Sunday', 'promo_percent_off_cta'],
    ['Limited-time offer: buy now', 'promo_limited_time'],
    ['Exclusive deal for you today', 'promo_limited_time'],
    // US marketing SMS — STOP opt-out language is legally required
    ['Get 20% off today. Reply STOP to unsubscribe', 'sms_reply_stop'],
    ['Text STOP to opt out anytime', 'sms_reply_stop'],
    ['Msg&data rates may apply. STOP to opt-out.', 'sms_stop_to_opt'],
    // Toll-free brand prefix (the actual live leak that prompted this rule)
    ['￼1-800 Contacts: Ready, Boyu? Get the exact same contacts you’ve been ordering.', 'sms_tollfree_prefix'],
    ['833-FRESH: Your first order ships free!', 'sms_tollfree_prefix'],
    // transactional / marketing footers
    ['Unsubscribe from these emails', 'footer_unsubscribe'],
    ['View this email in your browser', 'footer_view_in_browser'],
    ['This is an automated notification', 'footer_automated'],
    ['Please do not reply to this email', 'footer_do_not_reply'],
    ['Reach us at noreply@example.com', 'footer_noreply_addr'],
    ['Manage your email preferences here', 'footer_manage_prefs'],
    // LinkedIn + enterprise SaaS blasts
    ['New LinkedIn InMail from John', 'linkedin_inmail'],
    ['View full message on LinkedIn', 'linkedin_view_on'],
    ['Alex sent you a message on LinkedIn', 'linkedin_sent_message'],
    ['Welcome Boyu to Your Client Portal from Bryson Harris', 'portal_welcome'],
    ['You have a new message from Bryson Harris Suciu &', 'portal_new_message'],
    ['https://clientportal.filevineapp.com/messages/KPTC', 'portal_client_portal_url'],
    ['Mira sent you a doc via Notion', 'saas_sent_you_doc'],
    // Marketplace / gig rating notifications (the actual live leak)
    ['Marlen really enjoyed working with you & rated you 5 stars', 'review_enjoyed_working'],
    ['Sam enjoyed working with you and rated you', 'review_enjoyed_working'],
    ['You received a new review from Alex', 'review_new_review_from'],
    ['Youve got a new rating from your last trip', 'review_new_review_from'],
    ['Rate your recent ride with Uber', 'review_rate_your_exp'],
    ['Jordan left you a 5-star review', 'review_left_a_review'],
    ['You earned 5 stars on your last delivery!', 'review_you_got_n_stars'],
    ['Marlen completed your Fri, Apr 17 appointment! You can now rate…', 'marketplace_completion'],
    ['Alex completed your delivery ahead of schedule', 'marketplace_completion'],
    ['How was your recent experience with Uber?', 'marketplace_how_was_exp'],
    // receipts
    ['Order confirmation #8472910', 'receipt_order_confirmation'],
    ['Your subscription has been renewed', 'receipt_subscription_renewed'],
  ]

  for (const [text, expectedRule] of blocked) {
    it(`blocks: "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}" via ${expectedRule}`, () => {
      const result = checkAutomatedNoise(text)
      expect(result.isNoise).toBe(true)
      expect(result.rule).toBe(expectedRule)
    })
  }
})

describe('checkAutomatedNoise — does NOT block real student messages', () => {
  const allowed: string[] = [
    '学长 writ150 该选哪个教授',
    '有没有 CSCI 103 的 tip',
    'K-town 安全吗 我想找个合租',
    'Leavey 几楼最安静',
    '最近 BIA 有什么活动',
    '我想请教一下选课',
    // tricky but real — a student mentions a code value without it being an OTP phrase
    '我忘了我的 USC ID 是什么了',
    '这学期我要选 BUAD 280',
    // student inviting George to something — shouldn't be an "invited you to" phrase
    '你可以推荐一些想加入的社团吗',
    // Chinese containing "邀请" but not in calendar-invite register
    '朋友邀请我去一个 party 我该去吗',
    // Link with "zoom" but in sentence form
    '上网课在 zoom 上吗',
    // Contains "unsubscribe" only as vocabulary, not in footer form — the rule
    // requires "unsubscribe (from|here|at)" structure.
    'how do i unsubscribe my brain from finals anxiety 哈哈',
  ]

  for (const text of allowed) {
    it(`does NOT block real student msg: "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}"`, () => {
      const result = checkAutomatedNoise(text)
      expect(result.isNoise).toBe(false)
    })
  }
})

describe('checkAutomatedNoise — ctx is optional and logged', () => {
  it('accepts no ctx', () => {
    const result = checkAutomatedNoise('123456 is your verification code')
    expect(result.isNoise).toBe(true)
  })

  it('accepts ctx for logging', () => {
    const result = checkAutomatedNoise(
      'Jane has invited you to a call',
      { userId: 'u123', platform: 'imessage' },
    )
    expect(result.isNoise).toBe(true)
    expect(result.rule).toBe('invite_invited_you_to')
  })
})
