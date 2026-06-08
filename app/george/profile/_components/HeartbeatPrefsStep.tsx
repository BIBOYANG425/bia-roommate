// app/george/profile/_components/HeartbeatPrefsStep.tsx
'use client';
import { Dispatch, SetStateAction } from 'react';

interface PrefsValue {
  cadence: string;
  active_hours_start: string;
  active_hours_end: string;
  consent_proactive_messages: boolean;
  consent_anomaly_checkin: boolean;
}

export default function HeartbeatPrefsStep({
  value,
  onChange,
  onSubmit,
  submitting,
}: {
  value: PrefsValue;
  onChange: Dispatch<SetStateAction<PrefsValue>>;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--cardinal)' }}>
        how should george reach you
      </h2>

      <label style={{ display: 'block', margin: '1rem 0' }}>
        <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--mid)' }}>cadence</span>
        <select
          value={value.cadence}
          onChange={(e) => onChange({ ...value, cadence: e.target.value })}
          style={{ padding: '0.5rem', border: '1px solid var(--mid)', borderRadius: 4 }}
        >
          <option value="12 hours">twice a day</option>
          <option value="24 hours">once a day</option>
          <option value="7 days">weekly</option>
          <option value="off">off</option>
        </select>
      </label>

      <label style={{ display: 'block', margin: '1rem 0' }}>
        <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--mid)' }}>active hours</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="time"
            value={value.active_hours_start}
            onChange={(e) => onChange({ ...value, active_hours_start: e.target.value })}
            style={{ padding: '0.5rem', border: '1px solid var(--mid)', borderRadius: 4 }}
          />
          <span>to</span>
          <input
            type="time"
            value={value.active_hours_end}
            onChange={(e) => onChange({ ...value, active_hours_end: e.target.value })}
            style={{ padding: '0.5rem', border: '1px solid var(--mid)', borderRadius: 4 }}
          />
        </div>
      </label>

      <label style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        <input
          type="checkbox"
          checked={value.consent_proactive_messages}
          onChange={(e) => onChange({ ...value, consent_proactive_messages: e.target.checked })}
        />
        george can ping me about events I might like
      </label>

      <label style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        <input
          type="checkbox"
          checked={value.consent_anomaly_checkin}
          onChange={(e) => onChange({ ...value, consent_anomaly_checkin: e.target.checked })}
        />
        george can check in if I go quiet for more than 2 weeks
      </label>

      <button
        onClick={onSubmit}
        disabled={submitting}
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          background: submitting ? 'var(--mid)' : 'var(--cardinal)',
          color: 'var(--cream)',
          border: 'none',
          borderRadius: 4,
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? 'submitting' : 'finish'}
      </button>
    </div>
  );
}
