'use client';
import { useState } from 'react';

const CADENCE_OPTIONS = [
  { value: '12 hours', label: 'twice a day (default)' },
  { value: '24 hours', label: 'once a day' },
  { value: '7 days', label: 'weekly' },
  { value: 'off', label: 'off (no proactive)' },
];

interface Config {
  cadence?: string | null;
  active_hours_start?: string | null;
  active_hours_end?: string | null;
  timezone?: string | null;
  paused?: boolean | null;
}

export default function HeartbeatConfigSection({
  config,
  userId: _userId,
}: {
  config: Config | null;
  userId: string;
}) {
  const [cadence, setCadence] = useState(config?.cadence ?? '12 hours');
  const [startTime, setStartTime] = useState(
    config?.active_hours_start?.slice(0, 5) ?? '09:00',
  );
  const [endTime, setEndTime] = useState(
    config?.active_hours_end?.slice(0, 5) ?? '22:00',
  );
  const [paused, setPaused] = useState(config?.paused ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch('/account/george/api/heartbeat-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cadence,
          active_hours_start: startTime + ':00',
          active_hours_end: endTime + ':00',
          paused,
        }),
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
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl" style={{ color: 'var(--black)' }}>
          how george reaches you
        </h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--mid)' }}>
          how often george thinks about you and during what hours.
        </p>
      </div>
      <div
        className="space-y-4 p-4"
        style={{ border: '2px solid var(--black)', background: 'white' }}
      >
        <label className="block">
          <span className="text-sm" style={{ color: 'var(--black)' }}>
            cadence
          </span>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            className="mt-1 w-full p-2 text-sm"
            style={{ border: '2px solid var(--black)', background: 'var(--cream)', color: 'var(--black)' }}
          >
            {CADENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm" style={{ color: 'var(--black)' }}>
              active hours start
            </span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full p-2 text-sm"
              style={{ border: '2px solid var(--black)', background: 'var(--cream)', color: 'var(--black)' }}
            />
          </label>
          <label className="block">
            <span className="text-sm" style={{ color: 'var(--black)' }}>
              active hours end
            </span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full p-2 text-sm"
              style={{ border: '2px solid var(--black)', background: 'var(--cream)', color: 'var(--black)' }}
            />
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={paused}
            onChange={(e) => setPaused(e.target.checked)}
          />
          <span className="text-sm" style={{ color: 'var(--black)' }}>
            pause heartbeats entirely
          </span>
        </label>
        {error && (
          <p className="text-xs" style={{ color: 'var(--cardinal)' }}>
            {error}
          </p>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="font-display text-xs tracking-wider px-4 py-2"
          style={{
            background: saving ? 'var(--mid)' : 'var(--cardinal)',
            color: 'var(--cream)',
            border: '2px solid var(--black)',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'SAVING…' : saved ? 'SAVED ✓' : 'SAVE'}
        </button>
      </div>
    </section>
  );
}
