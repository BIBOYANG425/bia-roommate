import { NextResponse } from 'next/server';
import { authedHandler } from '@/lib/api/authed-handler';
import { z } from 'zod';

const schema = z.object({
  cadence: z.string().optional(),
  active_hours_start: z.string().optional(),
  active_hours_end: z.string().optional(),
  paused: z.boolean().optional(),
  consent_proactive_messages: z.boolean().optional(),
  consent_anomaly_checkin: z.boolean().optional(),
});

export const PUT = authedHandler({
  schema,
  handler: async ({ user, supabase, body }) => {
    const update: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (body.cadence === 'off') {
      update.paused = true;
    } else if (typeof body.cadence === 'string') {
      update.cadence = body.cadence;
      update.paused = body.paused ?? false;
    } else if (typeof body.paused === 'boolean') {
      update.paused = body.paused;
    }

    if (typeof body.active_hours_start === 'string') {
      update.active_hours_start = body.active_hours_start;
    }
    if (typeof body.active_hours_end === 'string') {
      update.active_hours_end = body.active_hours_end;
    }
    if (typeof body.consent_proactive_messages === 'boolean') {
      update.consent_proactive_messages = body.consent_proactive_messages;
    }
    if (typeof body.consent_anomaly_checkin === 'boolean') {
      update.consent_anomaly_checkin = body.consent_anomaly_checkin;
    }

    const { error } = await supabase.from('user_heartbeat_config').upsert(update);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  },
});
