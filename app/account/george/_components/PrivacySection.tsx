'use client';
import { useState } from 'react';

interface Config {
  consent_proactive_messages?: boolean | null;
  consent_anomaly_checkin?: boolean | null;
}

export default function PrivacySection({
  config,
  userId: _userId,
}: {
  config: Config | null;
  userId: string;
}) {
  const [proactive, setProactive] = useState(
    config?.consent_proactive_messages ?? false,
  );
  const [anomaly, setAnomaly] = useState(config?.consent_anomaly_checkin ?? false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [consentError, setConsentError] = useState('');

  async function updateConsents(
    nextProactive: boolean,
    nextAnomaly: boolean,
  ) {
    setConsentError('');
    try {
      const res = await fetch('/account/george/api/heartbeat-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_proactive_messages: nextProactive,
          consent_anomaly_checkin: nextAnomaly,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setConsentError(data.error ?? 'failed to save consent');
      }
    } catch {
      setConsentError('network error');
    }
  }

  async function deleteMe() {
    setDeleting(true);
    try {
      const res = await fetch('/account/george/api/delete-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      if (res.ok) {
        window.location.href = '/';
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'failed to delete');
        setDeleting(false);
      }
    } catch {
      alert('network error');
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl" style={{ color: 'var(--black)' }}>
          privacy & data
        </h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--mid)' }}>
          what george is allowed to do and how to delete your data.
        </p>
      </div>

      {/* Consent toggles */}
      <div
        className="space-y-3 p-4"
        style={{ border: '2px solid var(--black)', background: 'white' }}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={proactive}
            onChange={(e) => {
              setProactive(e.target.checked);
              updateConsents(e.target.checked, anomaly);
            }}
            className="mt-0.5"
          />
          <div>
            <div className="text-sm" style={{ color: 'var(--black)' }}>
              proactive messages
            </div>
            <div className="text-xs" style={{ color: 'var(--mid)' }}>
              george can ping me about events, followups, briefs
            </div>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={anomaly}
            onChange={(e) => {
              setAnomaly(e.target.checked);
              updateConsents(proactive, e.target.checked);
            }}
            className="mt-0.5"
          />
          <div>
            <div className="text-sm" style={{ color: 'var(--black)' }}>
              silence check-in
            </div>
            <div className="text-xs" style={{ color: 'var(--mid)' }}>
              george can ping me if I go quiet for more than 2 weeks
            </div>
          </div>
        </label>
        {consentError && (
          <p className="text-xs" style={{ color: 'var(--cardinal)' }}>
            {consentError}
          </p>
        )}
      </div>

      {/* Delete zone */}
      <div
        className="p-4"
        style={{
          border: '2px solid var(--cardinal)',
          background: 'color-mix(in srgb, var(--cardinal) 5%, white)',
        }}
      >
        <h3 className="font-display text-lg" style={{ color: 'var(--cardinal)' }}>
          delete everything
        </h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--cardinal)' }}>
          clears profile, heartbeat config, all messages, all followups. cannot be undone.
        </p>
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="mt-3 font-display text-xs tracking-wider px-3 py-1"
            style={{
              border: '2px solid var(--cardinal)',
              color: 'var(--cardinal)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            REQUEST DELETE
          </button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirmingDelete(false)}
              className="font-display text-xs tracking-wider px-3 py-1"
              style={{
                border: '2px solid var(--mid)',
                color: 'var(--mid)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              CANCEL
            </button>
            <button
              onClick={deleteMe}
              disabled={deleting}
              className="font-display text-xs tracking-wider px-3 py-1"
              style={{
                background: deleting ? 'var(--mid)' : 'var(--cardinal)',
                color: 'var(--cream)',
                border: '2px solid var(--black)',
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? 'DELETING…' : 'YES, DELETE ME'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
