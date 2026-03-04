import React from 'react';

interface StartPageProps {
  onNavigate: (path: '/report-analysis' | '/gst-calculator') => void;
}

const StartPage: React.FC<StartPageProps> = ({ onNavigate }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background: 'linear-gradient(135deg, #fef3c7 0%, #dbeafe 45%, #dcfce7 100%)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 860,
          borderRadius: 20,
          padding: 28,
          border: '2px solid #1e293b',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 16px 36px rgba(15, 23, 42, 0.18)'
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              margin: 0,
              marginBottom: 8,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: '#0f766e'
            }}
          >
            Alternate Delivery Channel
          </p>
          <h1 style={{ margin: 0, marginBottom: 8, fontSize: 34, lineHeight: 1.15, color: '#0f172a' }}>
            Bank of Bhutan Acquiring Reporting
          </h1>
          <p style={{ margin: 0, color: '#334155', fontSize: 16 }}>Select a module to continue.</p>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 14,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate('/report-analysis')}
            style={{
              border: '2px solid #1d4ed8',
              borderRadius: 14,
              padding: '16px 18px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
              color: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(37, 99, 235, 0.28)'
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>Go to Report Analysis</div>
            <div style={{ fontSize: 13, opacity: 0.95 }}>Open KPI dashboard and central bank reporting tools.</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/gst-calculator')}
            style={{
              border: '2px solid #15803d',
              borderRadius: 14,
              padding: '16px 18px',
              background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
              color: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(21, 128, 61, 0.28)'
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>GST Calculator</div>
            <div style={{ fontSize: 13, opacity: 0.95 }}>Import monthly PDF and generate merchant GST deduction receipt.</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartPage;
