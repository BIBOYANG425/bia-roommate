import { NextResponse } from 'next/server';
import { authedHandler } from '@/lib/api/authed-handler';
import { z } from 'zod';

const BLOCK_NAMES = [
  'identity',
  'academic',
  'interests',
  'relationships',
  'state',
  'george_notes',
] as const;

const schema = z.object({
  block_name: z.enum(BLOCK_NAMES),
  new_content: z.string().max(2000, 'Block content cannot exceed 2000 characters'),
});

export const PATCH = authedHandler({
  schema,
  handler: async ({ user, supabase, body }) => {
    const { block_name, new_content } = body;

    const { error } = await supabase.from('user_profiles').upsert({
      user_id: user.id,
      [block_name]: new_content,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  },
});
