export default function ExpiredPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ maxWidth: 500, padding: 40, background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16, color: '#ff4d4f' }}>&#8987;</div>
        <h1 style={{ margin: '0 0 12px', fontSize: 24, color: '#333' }}>Link Expired</h1>
        <p style={{ color: '#666', fontSize: 16, lineHeight: 1.6 }}>
          This link has expired. Follow-up links are valid for 30 days.
        </p>
        <p style={{ color: '#888', fontSize: 13, marginTop: 24 }}>
          Please contact us at support@reallandlording.com if you need assistance.
        </p>
      </div>
    </div>
  );
}
