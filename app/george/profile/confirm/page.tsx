// app/george/profile/confirm/page.tsx
export default function ConfirmPage() {
  return (
    <div
      style={{
        background: 'var(--cream)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: 480, padding: '3rem', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            color: 'var(--cardinal)',
            fontSize: '2.5rem',
          }}
        >
          george knows you now
        </h1>
        <p style={{ color: 'var(--mid)', marginTop: '1rem' }}>
          open iMessage to keep talking. he&apos;ll ping you within a day with something useful.
        </p>
      </div>
    </div>
  );
}
