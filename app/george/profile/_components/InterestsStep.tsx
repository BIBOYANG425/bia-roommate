// app/george/profile/_components/InterestsStep.tsx
'use client';
import { Dispatch, SetStateAction } from 'react';

interface InterestsValue {
  categories: string[];
  free_text: string;
}

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

export default function InterestsStep({
  value,
  onChange,
  onNext,
}: {
  value: InterestsValue;
  onChange: Dispatch<SetStateAction<InterestsValue>>;
  onNext: () => void;
}) {
  function toggle(cat: string) {
    const set = new Set(value.categories);
    if (set.has(cat)) set.delete(cat);
    else set.add(cat);
    onChange({ ...value, categories: Array.from(set) });
  }
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--cardinal)' }}>
        what are you into
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '1rem 0' }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${value.categories.includes(c) ? 'var(--cardinal)' : 'var(--mid)'}`,
              background: value.categories.includes(c) ? 'var(--cardinal)' : 'transparent',
              color: value.categories.includes(c) ? 'var(--cream)' : 'var(--mid)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--mid)' }}>
          anything else (200 chars max)
        </span>
        <textarea
          value={value.free_text}
          onChange={(e) => onChange({ ...value, free_text: e.target.value })}
          maxLength={200}
          rows={3}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--mid)', borderRadius: 4 }}
        />
      </label>
      <button
        onClick={onNext}
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          background: 'var(--cardinal)',
          color: 'var(--cream)',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        next
      </button>
    </div>
  );
}
