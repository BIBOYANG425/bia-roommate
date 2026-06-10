'use client';
// app/george/profile/page.tsx
// 5-card stacked onboarding flow. One question per card, next 2 cards visible
// behind the active one with a slight tilt + scale. BIA palette + Instrument
// Serif italic for the question. Cadence + active hours are NOT user-facing —
// defaults baked into the submit payload below.
//
// Submit payload shape stays identical to the original 4-step form so the
// /george/profile/api/submit handler keeps working without changes.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type Identity = {
  name: string;
  year: string;
  major: string;
  hometown: string;
  native_language: string;
  pronouns: string;
};

type Interests = {
  categories: string[];
  free_text: string;
};

const CARD_COUNT = 5;
const CATEGORIES = [
  'food',
  'hiking',
  'study groups',
  'networking',
  'parties',
  'career events',
  'sports',
  'music',
  'art',
  'gaming',
];
const YEARS = ['freshman', 'sophomore', 'junior', 'senior', 'grad'];

// Active hours mirror george's heartbeat default (09:00-22:00 LA). A narrow
// window here would quietly defeat the Slice B "first heartbeat within 12h"
// contract — heartbeats can only fire inside these hours.
const DEFAULT_PREFS = {
  cadence: '24 hours',
  active_hours_start: '09:00',
  active_hours_end: '22:00',
  consent_proactive_messages: true,
  consent_anomaly_checkin: false,
};

export default function ProfilePage() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get('code');

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState('');
  const [identity, setIdentity] = useState<Identity>({
    name: '',
    year: '',
    major: '',
    hometown: '',
    native_language: '',
    pronouns: '',
  });
  const [interests, setInterests] = useState<Interests>({ categories: [], free_text: '' });
  const [consents, setConsents] = useState({
    consent_proactive_messages: DEFAULT_PREFS.consent_proactive_messages,
    consent_anomaly_checkin: DEFAULT_PREFS.consent_anomaly_checkin,
  });

  useEffect(() => {
    if (!code) router.replace('/george');
  }, [code, router]);

  const validators: Array<() => boolean> = [
    () => email.toLowerCase().endsWith('@usc.edu') && email.length > '@usc.edu'.length,
    () =>
      identity.name.trim().length > 1 && Boolean(identity.year) && identity.major.trim().length > 0,
    () => identity.hometown.trim().length > 0 && identity.native_language.trim().length > 0,
    () => true,
    () => true,
  ];
  const canAdvance = validators[step]?.() ?? false;

  async function handleAdvance() {
    if (!canAdvance) return;
    if (step < CARD_COUNT - 1) {
      setStep(step + 1);
      return;
    }
    setSubmitting(true);
    const res = await fetch('/george/profile/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        email,
        identity,
        interests,
        prefs: {
          cadence: DEFAULT_PREFS.cadence,
          active_hours_start: DEFAULT_PREFS.active_hours_start,
          active_hours_end: DEFAULT_PREFS.active_hours_end,
          consent_proactive_messages: consents.consent_proactive_messages,
          consent_anomaly_checkin: consents.consent_anomaly_checkin,
        },
      }),
    });
    if (res.ok) {
      router.push('/george/profile/confirm');
    } else {
      const txt = await res.text().catch(() => '');
      alert(`submit failed. ${txt}`);
      setSubmitting(false);
    }
  }

  const cards = useMemo(
    () => [
      <CardEmail key="email" value={email} onChange={setEmail} />,
      <CardWhoYouAre key="who" value={identity} onChange={setIdentity} />,
      <CardWhereYouFrom key="where" value={identity} onChange={setIdentity} />,
      <CardWhatYoureInto key="into" value={interests} onChange={setInterests} />,
      <CardTwoThings key="consents" value={consents} onChange={setConsents} />,
    ],
    [email, identity, interests, consents],
  );

  // Early return must come after every hook (react-hooks/rules-of-hooks);
  // the useEffect above redirects to /george while this renders nothing.
  if (!code) return null;

  return (
    <div style={pageStyle}>
      <div style={progressStyle}>{`${step + 1} / ${CARD_COUNT}`}</div>

      <div style={stackStyle}>
        {cards.map((card, i) => {
          const offset = i - step;
          if (offset < 0 || offset > 2) return null;
          const isActive = offset === 0;
          const transform =
            offset === 0
              ? 'translateY(0) rotate(0deg) scale(1)'
              : offset === 1
                ? 'translateY(20px) translateX(-12px) rotate(-3deg) scale(0.95)'
                : 'translateY(36px) translateX(18px) rotate(4deg) scale(0.9)';
          return (
            <div
              key={i}
              style={{
                ...cardWrapStyle,
                transform,
                zIndex: 10 - offset,
                opacity: offset === 0 ? 1 : offset === 1 ? 0.55 : 0.3,
                background: offset === 0 ? 'var(--cardinal)' : '#A4A095',
                pointerEvents: isActive ? 'auto' : 'none',
                color: 'var(--cream)',
              }}
            >
              <div style={brandMarkStyle}>g_</div>
              {card}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleAdvance}
        disabled={!canAdvance || submitting}
        style={{
          ...arrowButtonStyle,
          opacity: canAdvance && !submitting ? 1 : 0.4,
          cursor: canAdvance && !submitting ? 'pointer' : 'not-allowed',
        }}
        aria-label={step === CARD_COUNT - 1 ? 'finish' : 'next'}
      >
        {submitting ? '…' : step === CARD_COUNT - 1 ? 'finish' : '→'}
      </button>
    </div>
  );
}

// ───────── card components ─────────

function CardEmail({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CardBody
      title={"first, your usc email"}
      subtitle={"george is for usc folks. won't email you, just need to know it's really you."}
    >
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="your.email@usc.edu"
        style={inputStyle}
        autoFocus
      />
    </CardBody>
  );
}

function CardWhoYouAre({
  value,
  onChange,
}: {
  value: Identity;
  onChange: (v: Identity) => void;
}) {
  return (
    <CardBody title={"who you are"} subtitle={"so I'm not chatting with a stranger."}>
      <input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="name"
        style={inputStyle}
      />
      <select
        value={value.year}
        onChange={(e) => onChange({ ...value, year: e.target.value })}
        style={{ ...inputStyle, appearance: 'auto' }}
      >
        <option value="">year</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <input
        value={value.major}
        onChange={(e) => onChange({ ...value, major: e.target.value })}
        placeholder="major (or 'still deciding')"
        style={inputStyle}
      />
    </CardBody>
  );
}

function CardWhereYouFrom({
  value,
  onChange,
}: {
  value: Identity;
  onChange: (v: Identity) => void;
}) {
  return (
    <CardBody title={"where you come from"} subtitle={"helps me know what feels like home."}>
      <input
        value={value.hometown}
        onChange={(e) => onChange({ ...value, hometown: e.target.value })}
        placeholder="hometown"
        style={inputStyle}
      />
      <input
        value={value.native_language}
        onChange={(e) => onChange({ ...value, native_language: e.target.value })}
        placeholder="native language (e.g. mandarin)"
        style={inputStyle}
      />
      <input
        value={value.pronouns}
        onChange={(e) => onChange({ ...value, pronouns: e.target.value })}
        placeholder="pronouns (optional)"
        style={inputStyle}
      />
    </CardBody>
  );
}

function CardWhatYoureInto({
  value,
  onChange,
}: {
  value: Interests;
  onChange: (v: Interests) => void;
}) {
  function toggle(cat: string) {
    const s = new Set(value.categories);
    if (s.has(cat)) s.delete(cat);
    else s.add(cat);
    onChange({ ...value, categories: Array.from(s) });
  }
  return (
    <CardBody title={"what you're into"} subtitle={"tap whatever vibes. I'll find your people."}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.5rem 0 1rem' }}>
        {CATEGORIES.map((c) => {
          const on = value.categories.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggle(c)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 999,
                fontSize: '0.875rem',
                border: `1px solid var(--cream)`,
                background: on ? 'var(--cream)' : 'transparent',
                color: on ? 'var(--cardinal)' : 'var(--cream)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {c}
            </button>
          );
        })}
      </div>
      <textarea
        value={value.free_text}
        onChange={(e) => onChange({ ...value, free_text: e.target.value })}
        placeholder="anything else? (optional, 200 chars)"
        maxLength={200}
        rows={2}
        style={{ ...inputStyle, resize: 'none' }}
      />
    </CardBody>
  );
}

function CardTwoThings({
  value,
  onChange,
}: {
  value: { consent_proactive_messages: boolean; consent_anomaly_checkin: boolean };
  onChange: (v: { consent_proactive_messages: boolean; consent_anomaly_checkin: boolean }) => void;
}) {
  return (
    <CardBody title={"two quick things"} subtitle={"flip what feels right."}>
      <label style={consentRow}>
        <input
          type="checkbox"
          checked={value.consent_proactive_messages}
          onChange={(e) => onChange({ ...value, consent_proactive_messages: e.target.checked })}
        />
        <span>george can ping me about events I might like</span>
      </label>
      <label style={consentRow}>
        <input
          type="checkbox"
          checked={value.consent_anomaly_checkin}
          onChange={(e) => onChange({ ...value, consent_anomaly_checkin: e.target.checked })}
        />
        <span>george can check in if I go quiet for more than 2 weeks</span>
      </label>
    </CardBody>
  );
}

function CardBody({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: '2.3rem',
          lineHeight: 1.05,
          margin: '0 0 0.2rem',
          color: 'var(--cream)',
          fontWeight: 400,
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0, maxWidth: 320 }}>{subtitle}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1rem' }}>
        {children}
      </div>
    </div>
  );
}

// ───────── styles ─────────

const pageStyle: React.CSSProperties = {
  background: 'var(--cream)',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem 6rem',
  position: 'relative',
};

const progressStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1.5rem',
  right: '1.5rem',
  fontSize: '0.8rem',
  color: 'var(--mid)',
  letterSpacing: '0.05em',
};

const stackStyle: React.CSSProperties = {
  position: 'relative',
  width: 'min(420px, 92vw)',
  height: 520,
};

const cardWrapStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 28,
  padding: '2rem 1.75rem',
  boxShadow: '0 20px 60px -20px rgba(40, 5, 12, 0.45)',
  transition: 'transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 350ms ease',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const brandMarkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontSize: '1.1rem',
  marginBottom: '0.75rem',
  opacity: 0.9,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 0.85rem',
  border: '1px solid rgba(242, 235, 217, 0.4)',
  background: 'rgba(242, 235, 217, 0.08)',
  color: 'var(--cream)',
  borderRadius: 8,
  fontSize: '1rem',
  outline: 'none',
};

const consentRow: React.CSSProperties = {
  display: 'flex',
  gap: '0.6rem',
  alignItems: 'flex-start',
  padding: '0.6rem 0',
  fontSize: '0.95rem',
  cursor: 'pointer',
};

const arrowButtonStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '2.5rem',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 180,
  padding: '0.95rem 1rem',
  borderRadius: 999,
  background: 'var(--cardinal)',
  color: 'var(--cream)',
  border: 'none',
  fontSize: '1.05rem',
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  transition: 'opacity 200ms ease',
};
