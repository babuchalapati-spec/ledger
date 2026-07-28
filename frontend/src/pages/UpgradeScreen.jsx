import { useEffect, useState } from 'react';
import { getPublicPlans, getPublicPlatformSettings } from '../api/client';

export default function UpgradeScreen() {
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getPublicPlans().then(setPlans).catch(() => {});
    getPublicPlatformSettings().then(setSettings).catch(() => {});
  }, []);

  const fmtPrice = (n) => Number(n || 0).toLocaleString('en-IN');
  const periodLabel = { monthly: '/month', yearly: '/year', 'one-time': ' one-time' };

  return (
    <div className="server-connect">
      <div className="card server-connect-card" style={{ maxWidth: 560 }}>
        <h2>⏳ Your Trial Has Ended</h2>
        <p className="muted">{settings?.upgradeMessage || 'Please upgrade to continue using the app.'}</p>

        {plans.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {plans.map((p) => (
              <div key={p._id} className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong>{p.name}</strong>
                  <span>₹{fmtPrice(p.price)}{periodLabel[p.billingPeriod] || ''}</span>
                </div>
                {p.description && <p className="muted" style={{ margin: '6px 0 0' }}>{p.description}</p>}
              </div>
            ))}
          </div>
        )}

        {(settings?.contactPhone || settings?.contactWhatsApp || settings?.contactEmail) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            {settings.contactPhone && (
              <a className="btn-primary" href={`tel:${settings.contactPhone}`}>📞 Call Us</a>
            )}
            {settings.contactWhatsApp && (
              <a className="btn-secondary" href={`https://wa.me/${settings.contactWhatsApp}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>
            )}
            {settings.contactEmail && (
              <a className="btn-secondary" href={`mailto:${settings.contactEmail}`}>✉ Email</a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
