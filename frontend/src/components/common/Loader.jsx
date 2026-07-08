export function Loader({ fullPage = false, text = 'Loading...' }) {
  if (fullPage) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--canvas-soft)',
      }}>
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
        <span style={{ fontSize: 'var(--body-sm)', color: 'var(--body)' }}>{text}</span>
      </div>
    );
  }

  return (
    <div className="loading-container">
      <div className="loading-dots">
        <span />
        <span />
        <span />
      </div>
      {text && <span>{text}</span>}
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="loading-spinner" />
  );
}
