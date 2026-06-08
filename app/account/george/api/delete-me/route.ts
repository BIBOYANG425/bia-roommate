import { NextResponse } from 'next/server';
import { authedHandler } from '@/lib/api/authed-handler';
import { z } from 'zod';

const schema = z.object({
  confirm: z.literal(true, { message: 'confirm must be true' }),
});

const TABLES_WITH_USER_ID = [
  'user_profiles',
  'user_heartbeat_config',
  'user_heartbeat_instructions',
  'heartbeat_log',
  'student_followups',
  'messages',
] as const;

export const POST = authedHandler({
  schema,
  handler: async ({ user, supabase }) => {
    const results = await Promise.all(
      TABLES_WITH_USER_ID.map((table) =>
        supabase.from(table).delete().eq('user_id', user.id),
      ),
    );

    const errors = results
      .filter((r) => r.error)
      .map((r) => r.error!.message);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
    }

    // Best-effort audit log — table may not exist in all environments
    try {
      await supabase.from('admin_audit_log').insert({
        actor_email: user.email,
        action: 'user_delete_web',
        entity_type: 'user',
        entity_id: user.id,
        payload: {},
      });
    } catch {
      // Non-fatal — do not block the delete response
    }

    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  },
});
