// app/george/profile/_components/IdentityStep.tsx
'use client';
import { Dispatch, SetStateAction } from 'react';

interface IdentityValue {
  name: string;
  year: string;
  major: string;
  hometown: string;
  native_language: string;
  pronouns: string;
}

export default function IdentityStep({
  value,
  onChange,
  onNext,
}: {
  value: IdentityValue;
  onChange: Dispatch<SetStateAction<IdentityValue>>;
  onNext: () => void;
}) {
  const can = value.name.length > 1 && value.year && value.hometown;
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--cardinal)' }}>
        who are you
      </h2>
      <Field label="name" value={value.name} onChange={(v) => onChange({ ...value, name: v })} />
      <Field
        label="year"
        value={value.year}
        onChange={(v) => onChange({ ...value, year: v })}
        placeholder="freshman / sophomore / junior / senior / grad"
      />
      <Field
        label="major (or 'still deciding')"
        value={value.major}
        onChange={(v) => onChange({ ...value, major: v })}
      />
      <Field label="hometown" value={value.hometown} onChange={(v) => onChange({ ...value, hometown: v })} />
      <Field
        label="native language"
        value={value.native_language}
        onChange={(v) => onChange({ ...value, native_language: v })}
        placeholder="mandarin / cantonese / english / ..."
      />
      <Field
        label="pronouns (optional)"
        value={value.pronouns}
        onChange={(v) => onChange({ ...value, pronouns: v })}
      />
      <button
        onClick={onNext}
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: '1rem' }}>
      <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--mid)' }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--mid)', borderRadius: 4 }}
      />
    </label>
  );
}
