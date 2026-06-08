import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProfileSection from './_components/ProfileSection';
import HeartbeatConfigSection from './_components/HeartbeatConfigSection';
import PrivacySection from './_components/PrivacySection';

export default async function GeorgeSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: config }] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('user_heartbeat_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  return (
    <div
      className="mx-auto max-w-3xl space-y-12 p-6"
      style={{ background: 'var(--cream)', minHeight: '100vh' }}
    >
      <header>
        <h1
          className="font-display text-3xl"
          style={{ color: 'var(--black)' }}
        >
          george settings
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--mid)' }}>
          what george knows about you, how he reaches you, and your privacy.
        </p>
      </header>
      <ProfileSection profile={profile} userId={user.id} />
      <HeartbeatConfigSection config={config} userId={user.id} />
      <PrivacySection config={config} userId={user.id} />
    </div>
  );
}
