// app/george/profile/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import IdentityStep from './_components/IdentityStep';
import InterestsStep from './_components/InterestsStep';
import HeartbeatPrefsStep from './_components/HeartbeatPrefsStep';

export default function ProfilePage() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get('code');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [identity, setIdentity] = useState({ name: '', year: '', major: '', hometown: '', native_language: '', pronouns: '' });
  const [interests, setInterests] = useState({ categories: [] as string[], free_text: '' });
  const [prefs, setPrefs] = useState({
    cadence: '12 hours',
    active_hours_start: '09:00',
    active_hours_end: '22:00',
    consent_proactive_messages: true,
    consent_anomaly_checkin: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!code) router.replace('/george');
  }, [code, router]);

  if (!code) return null;

  async function submit() {
    setSubmitting(true);
    const res = await fetch('/george/profile/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, email, identity, interests, prefs }),
    });
    if (res.ok) {
      router.push('/george/profile/confirm');
    } else {
      alert('submit failed. try again or hit Bobby in the bia chat.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <p style={{ color: 'var(--mid)', fontSize: '0.875rem' }}>step {step} of 4</p>
        {step === 1 && (
          <UscEmailGate
            value={email}
            onChange={setEmail}
            onVerified={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <IdentityStep value={identity} onChange={setIdentity} onNext={() => setStep(3)} />
        )}
        {step === 3 && (
          <InterestsStep value={interests} onChange={setInterests} onNext={() => setStep(4)} />
        )}
        {step === 4 && (
          <HeartbeatPrefsStep
            value={prefs}
            onChange={setPrefs}
            onSubmit={submit}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}

// TODO Slice F (auth): replace this email-format gate with real OAuth + USC
// email verification once bia-roommate adds the OTP or OAuth-with-domain-claim
// flow. For Slice B pilot, Bobby personally distributes codes to vetted
// freshmen so trust-on-input is acceptable.
function UscEmailGate({
  value,
  onChange,
  onVerified,
}: {
  value: string;
  onChange: (v: string) => void;
  onVerified: () => void;
}) {
  const can = value.toLowerCase().endsWith('@usc.edu') && value.length > '@usc.edu'.length;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--cardinal)' }}>
        what&apos;s your usc email
      </h2>
      <p style={{ color: 'var(--mid)', fontSize: '0.875rem' }}>
        george is currently for usc students. type yours below.
      </p>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="your.email@usc.edu"
        style={{
          width: '100%',
          padding: '0.75rem',
          marginTop: '1rem',
          border: '1px solid var(--mid)',
          borderRadius: 4,
        }}
      />
      <button
        onClick={onVerified}
        disabled={!can}
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          background: can ? 'var(--cardinal)' : 'var(--mid)',
          color: 'var(--cream)',
          border: 'none',
          borderRadius: 4,
          cursor: can ? 'pointer' : 'not-allowed',
        }}
      >
        next
      </button>
    </div>
  );
}
