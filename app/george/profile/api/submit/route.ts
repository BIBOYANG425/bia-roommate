// app/george/profile/api/submit/route.ts
// Ingests the 4-step onboarding form and writes the 3-table contract that
// the heartbeat scheduler reads (user_profiles + user_heartbeat_config +
// user_heartbeat_instructions). Also creates the students row.
//
// Slice B simplification: no real auth integration yet. We generate a UUID
// for user_id, create students + 3-table rows linked by it, and mark
// pending_users.status = 'completed'. Email is stored in user_profiles.identity
// (text block) but NOT linked to auth.users. Real OAuth linkage happens in
// Slice F — at that point, match by email to associate auth.users.id with
// the student record.
// Header last reviewed: 2026-06-08
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const schema = z.object({
  code: z.string().length(6),
  email: z.string().email(),
  identity: z.object({
    name: z.string().min(1).max(100),
    year: z.string().min(1).max(50),
    major: z.string().min(1).max(100),
    hometown: z.string().min(1).max(100),
    native_language: z.string().max(50),
    pronouns: z.string().max(30),
  }),
  interests: z.object({
    categories: z.array(z.string()).max(20),
    free_text: z.string().max(200),
  }),
  prefs: z.object({
    cadence: z.string(),
    active_hours_start: z.string(),
    active_hours_end: z.string(),
    consent_proactive_messages: z.boolean(),
    consent_anomaly_checkin: z.boolean(),
  }),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', issues: parsed.error.issues }, { status: 400 });
  }
  const { code, email, identity, interests, prefs } = parsed.data;

  const supabase = createAdminSupabaseClient();

  // Look up pending row
  const { data: pending, error: pErr } = await supabase
    .from('pending_users')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (pErr || !pending) return NextResponse.json({ error: 'unknown code' }, { status: 404 });
  if (pending.status === 'completed') return NextResponse.json({ error: 'already completed' }, { status: 409 });

  // Generate user_id. TODO Slice F: replace with auth.users.id from real auth flow.
  const userId = randomUUID();

  // Create students row (FK target for user_profiles, etc.)
  const interestsArray = interests.categories;
  const { error: studentErr } = await supabase.from('students').insert({
    user_id: userId,
    imessage_id: pending.imessage_handle,
    name: identity.name,
    major: identity.major,
    year: identity.year,
    interests: interestsArray,
    onboarding_complete: true,
  });
  if (studentErr) return NextResponse.json({ error: `student insert: ${studentErr.message}` }, { status: 500 });

  // Write 3-table contract
  const { error: profileErr } = await supabase.from('user_profiles').insert({
    user_id: userId,
    identity: renderIdentity(identity, email),
    academic: `year: ${identity.year}, major: ${identity.major}`,
    interests: renderInterests(interests),
    relationships: '',
    state: `new_user: true, onboarded_at: ${new Date().toISOString()}`,
    george_notes: '',
  });
  if (profileErr) return NextResponse.json({ error: `profile insert: ${profileErr.message}` }, { status: 500 });

  const cadenceInterval = prefs.cadence === 'off' ? '12 hours' : prefs.cadence;
  const isPaused = prefs.cadence === 'off';
  const { error: configErr } = await supabase.from('user_heartbeat_config').insert({
    user_id: userId,
    cadence: cadenceInterval,
    active_hours_start: `${prefs.active_hours_start}:00`,
    active_hours_end: `${prefs.active_hours_end}:00`,
    timezone: 'America/Los_Angeles',
    paused: isPaused,
    consent_proactive_messages: prefs.consent_proactive_messages,
    consent_anomaly_checkin: prefs.consent_anomaly_checkin,
  });
  if (configErr) return NextResponse.json({ error: `config insert: ${configErr.message}` }, { status: 500 });

  const instructions = renderStandingInstructions(identity, interests, prefs);
  const { error: instErr } = await supabase.from('user_heartbeat_instructions').insert({
    user_id: userId,
    content: instructions,
  });
  if (instErr) return NextResponse.json({ error: `instructions insert: ${instErr.message}` }, { status: 500 });

  // Mark pending row completed
  await supabase.from('pending_users').update({ status: 'completed' }).eq('code', code);

  return NextResponse.json({ ok: true, user_id: userId });
}

function renderIdentity(i: z.infer<typeof schema>['identity'], email: string): string {
  const parts = [
    `name: ${i.name}`,
    `email: ${email}`,
    `year: ${i.year}`,
    `major: ${i.major}`,
    `hometown: ${i.hometown}`,
    i.native_language ? `native_language: ${i.native_language}` : null,
    i.pronouns ? `pronouns: ${i.pronouns}` : null,
  ];
  return parts.filter(Boolean).join('\n');
}

function renderInterests(i: z.infer<typeof schema>['interests']): string {
  const cats = i.categories.length ? `categories: ${i.categories.join(', ')}` : '';
  const free = i.free_text ? `other: ${i.free_text}` : '';
  return [cats, free].filter(Boolean).join('\n');
}

function renderStandingInstructions(
  identity: z.infer<typeof schema>['identity'],
  interests: z.infer<typeof schema>['interests'],
  prefs: z.infer<typeof schema>['prefs'],
): string {
  return `# Standing instructions for ${identity.name}

## Event brief preference
- Cadence: ${prefs.cadence}
- Categories: ${interests.categories.join(', ') || 'general'}
- Last brief sent: never

## Tone calibration
- ${identity.native_language === 'mandarin' ? 'Mixes Mandarin and English; reply in matching language.' : 'Reply in English unless user code-switches.'}

## First 24 hours
- Be welcoming. No proactive nudges yet.
- Trust the user; let them drive.
`;
}
