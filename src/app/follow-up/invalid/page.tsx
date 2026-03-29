export default function InvalidPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ maxWidth: 500, padding: 40, background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16, color: '#faad14' }}>&#9888;</div>
        <h1 style={{ margin: '0 0 12px', fontSize: 24, color: '#333' }}>Invalid Link</h1>
        <p style={{ color: '#666', fontSize: 16, lineHeight: 1.6 }}>
          This link is invalid or has already been used.
        </p>
        <p style={{ color: '#888', fontSize: 13, marginTop: 24 }}>
          If you believe this is an error, please contact us at support@reallandlording.com
        </p>
      </div>
    </div>
  );
}
