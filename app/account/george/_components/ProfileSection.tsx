'use client';
import { useState } from 'react';

const BLOCKS = [
  { name: 'identity', label: 'Identity', help: 'Name, year, major, hometown, native language' },
  { name: 'academic', label: 'Academic', help: 'Current courses, GPA concerns, upcoming exams' },
  { name: 'interests', label: 'Interests', help: 'Hobbies, activities, tone preference' },
  { name: 'relationships', label: 'Relationships', help: 'Cohort senior, squad, recent intros' },
  { name: 'state', label: 'State', help: 'Slow-moving emotional + contextual state' },
  {
    name: 'george_notes',
    label: "george's notes",
    help: 'Commitments george has made to remember',
  },
] as const;

type BlockName = (typeof BLOCKS)[number]['name'];

interface Profile {
  identity?: string | null;
  academic?: string | null;
  interests?: string | null;
  relationships?: string | null;
  state?: string | null;
  george_notes?: string | null;
}

export default function ProfileSection({
  profile,
  userId,
}: {
  profile: Profile | null;
  userId: string;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl" style={{ color: 'var(--black)' }}>
          what george knows about you
        </h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--mid)' }}>
          the full markdown content of all 6 blocks. edit any block and save.
        </p>
      </div>
      <div className="space-y-4">
        {BLOCKS.map((block) => (
          <BlockEditor
            key={block.name}
            block={block}
            initial={profile?.[block.name as BlockName] ?? ''}
            userId={userId}
          />
        ))}
      </div>
    </section>
  );
}

function BlockEditor({
  block,
  initial,
  userId: _userId,
}: {
  block: (typeof BLOCKS)[number];
  initial: string | null;
  userId: string;
}) {
  const [content, setContent] = useState(initial ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch('/account/george/api/profile-block', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_name: block.name, new_content: content }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'failed to save');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{
        border: '2px solid var(--black)',
        background: 'white',
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-base" style={{ color: 'var(--black)' }}>
            {block.label}
          </h3>
          <p className="text-xs" style={{ color: 'var(--mid)' }}>
            {block.help}
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || content === (initial ?? '')}
          className="font-display text-xs tracking-wider px-3 py-1"
          style={{
            background: saving || content === (initial ?? '') ? 'var(--mid)' : 'var(--cardinal)',
            color: 'var(--cream)',
            border: '2px solid var(--black)',
            cursor: saving || content === (initial ?? '') ? 'not-allowed' : 'pointer',
            opacity: saving || content === (initial ?? '') ? 0.6 : 1,
          }}
        >
          {saving ? 'SAVING…' : saved ? 'SAVED ✓' : 'SAVE'}
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        maxLength={2000}
        className="mt-3 w-full p-3 text-sm font-mono"
        style={{
          border: '2px solid var(--black)',
          background: 'var(--cream)',
          color: 'var(--black)',
          resize: 'vertical',
        }}
        placeholder="(empty)"
      />
      <div className="mt-1 flex justify-between items-center">
        {error ? (
          <p className="text-xs" style={{ color: 'var(--cardinal)' }}>
            {error}
          </p>
        ) : (
          <span />
        )}
        <p className="text-xs" style={{ color: 'var(--mid)' }}>
          {content.length}/2000
        </p>
      </div>
    </div>
  );
}
