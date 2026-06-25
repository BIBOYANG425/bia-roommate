// app/george/profile/api/submit/route.ts
// Ingests the card-stack onboarding form and writes the 3-table contract
// that the heartbeat scheduler reads (user_profiles + user_heartbeat_config
// + user_heartbeat_instructions). Also reconciles the students row.
//
// Slice B simplification: no interactive sign-in yet. We mint (or fetch) a
// confirmed auth.users row by form email via the admin API, then call the
// reconcile_identity RPC (the single atomic merge primitive) with that auth id
// + the canonical phone to create/backfill/merge the one canonical students row
// (re-pointing FKs, merging user_profiles, guarding the two-auth-accounts case).
// pending_users.status flips to 'completed' at the end. Real OAuth sign-in
// replaces the implicit user creation in Slice F.
// Header last reviewed: 2026-06-24
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { canonicalizePhone } from '@biboyang425/bia-shared/phone';
import { z } from 'zod';

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

  // Resolve user_id. students.user_id is FK to auth.users.id with a UNIQUE
  // constraint, so we must create (or fetch) an auth.users row by email FIRST
  // and then link students.user_id to that id. Random UUIDs fail the FK check
  // silently inside Supabase's update API.
  //
  // TODO Slice F: replace this implicit auth user creation with a real OAuth
  // sign-in. For the pilot, we mint a confirmed auth user per email so the
  // student data chain works end-to-end.
  let userId: string;
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created?.user?.id) {
    userId = created.user.id;
  } else {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      return NextResponse.json({ error: `auth list: ${listErr.message}` }, { status: 500 });
    }
    const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) {
      return NextResponse.json(
        { error: `auth: cannot create or find user (${createErr?.message ?? 'unknown'})` },
        { status: 500 },
      );
    }
    userId = found.id;
  }

  // Reconcile the students row via the single, atomic, idempotent merge primitive
  // (reconcile_identity, spec §4) — replaces the old inline 4-branch delete+attach,
  // which had no guard against stealing a phone already bound to a DIFFERENT auth
  // account (and was a non-transactional delete+update). One call creates /
  // backfills / merges by canonical phone OR this auth account, re-pointing every
  // FK child and merging user_profiles, then returns the canonical students row.
  // The handle is canonicalized so it matches what george stores (defensive — new
  // signups already store canonical handles via normalizePhone).
  const rawHandle = pending.imessage_handle as string | null;
  const canon = rawHandle ? canonicalizePhone(rawHandle) : null;
  const canonicalHandle = canon?.ok ? canon.e164 : rawHandle;

  const { data: reconciled, error: recErr } = await supabase.rpc('reconcile_identity', {
    p_auth_user_id: userId,
    p_phone_e164: canonicalHandle,
    p_email: email,
  });
  if (recErr) {
    return NextResponse.json({ error: `reconcile: ${recErr.message}` }, { status: 500 });
  }
  const reconciledRow = Array.isArray(reconciled) ? reconciled[0] : reconciled;
  const primaryStudentId = (reconciledRow as { student_id?: string } | null | undefined)?.student_id;
  if (!primaryStudentId) {
    return NextResponse.json({ error: 'reconcile: no student row returned' }, { status: 500 });
  }

  const interestsArray = interests.categories;

  const { error: studentErr } = await supabase
    .from('students')
    .update({
      name: identity.name,
      major: identity.major,
      year: identity.year,
      interests: interestsArray,
      onboarding_complete: true,
    })
    .eq('id', primaryStudentId);
  if (studentErr) {
    return NextResponse.json({ error: `student data: ${studentErr.message}` }, { status: 500 });
  }

  // Cold-start matching profile (spec §7.6): picks → tags + embedded facets.
  // Failure here must NEVER fail onboarding — log and continue (tags/vectors
  // can be rebuilt by the Phase-0 backfill).
  try {
    const { buildMatchingProfile, makeEmbedClient } = await import("@/lib/matching/interests");
    const embed = makeEmbedClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const result = await buildMatchingProfile(supabase, primaryStudentId, {
      categories: interests.categories ?? [],
      freeText: interests.free_text ?? "",
      major: identity.major ?? null,
      year: identity.year ?? null,
    }, embed);
    console.log(`[matching] onboarding profile built for ${primaryStudentId}:`, JSON.stringify(result));
  } catch (e) {
    console.error("[matching] onboarding profile build failed (non-fatal):", e);
  }

  // Write 3-table contract via upsert so re-onboarding overwrites stale memory
  // blocks (otherwise a returning user keeps old profile content forever).
  const { error: profileErr } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      identity: renderIdentity(identity, email),
      academic: `year: ${identity.year}, major: ${identity.major}`,
      interests: renderInterests(interests),
      relationships: '',
      state: `new_user: true, onboarded_at: ${new Date().toISOString()}`,
      george_notes: '',
    },
    { onConflict: 'user_id' },
  );
  if (profileErr) return NextResponse.json({ error: `profile upsert: ${profileErr.message}` }, { status: 500 });

  const cadenceInterval = prefs.cadence === 'off' ? '12 hours' : prefs.cadence;
  const isPaused = prefs.cadence === 'off';
  const { error: configErr } = await supabase.from('user_heartbeat_config').upsert(
    {
      user_id: userId,
      cadence: cadenceInterval,
      active_hours_start: `${prefs.active_hours_start}:00`,
      active_hours_end: `${prefs.active_hours_end}:00`,
      timezone: 'America/Los_Angeles',
      paused: isPaused,
      consent_proactive_messages: prefs.consent_proactive_messages,
      consent_anomaly_checkin: prefs.consent_anomaly_checkin,
    },
    { onConflict: 'user_id' },
  );
  if (configErr) return NextResponse.json({ error: `config upsert: ${configErr.message}` }, { status: 500 });

  const instructions = renderStandingInstructions(identity, interests, prefs);
  const { error: instErr } = await supabase.from('user_heartbeat_instructions').upsert(
    {
      user_id: userId,
      content: instructions,
    },
    { onConflict: 'user_id' },
  );
  if (instErr) return NextResponse.json({ error: `instructions upsert: ${instErr.message}` }, { status: 500 });

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
