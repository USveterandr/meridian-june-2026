/**
 * RoiCalculator — embeddable short-term rental yield estimator.
 *
 * Uses vanilla CSS via class names already defined in the project.
 * Accepts an optional `priceCents` prop to pre-seed the purchase price.
 */

import { useState, useMemo } from 'react';
import { useLang } from '../i18n';

interface Props {
  /** Pre-filled purchase price in cents (from a listing page). Optional. */
  priceCents?: number;
}

function fmtUsd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

export default function RoiCalculator({ priceCents }: Props) {
  const { t } = useLang();

  const defaultPrice = priceCents != null ? Math.round(priceCents / 100) : 250_000;
  const [price, setPrice] = useState(defaultPrice);
  const [nightly, setNightly] = useState(150);
  const [occupancy, setOccupancy] = useState(65); // percent
  const [mgmt, setMgmt] = useState(20); // percent

  const { grossAnnual, grossYield, netYield, monthlyNet } = useMemo(() => {
    const daysOccupied = 365 * (occupancy / 100);
    const grossAnnual = nightly * daysOccupied;
    const grossYield = price > 0 ? (grossAnnual / price) * 100 : 0;
    const netAnnual = grossAnnual * (1 - mgmt / 100);
    const netYield = price > 0 ? (netAnnual / price) * 100 : 0;
    const monthlyNet = netAnnual / 12;
    return { grossAnnual, grossYield, netYield, monthlyNet };
  }, [price, nightly, occupancy, mgmt]);

  const yieldColor = grossYield >= 10 ? '#4ade80' : grossYield >= 6 ? '#c8a24b' : '#e07070';

  return (
    <section
      id="roi-calculator"
      aria-label={t('roi.title')}
      style={{
        background: 'linear-gradient(135deg,#12191e 60%,#0d1114)',
        border: '1px solid #2a3238',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '560px',
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#c8a24b', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
          Investor Tools
        </p>
        <h2 style={{ color: '#e8ebed', fontSize: '22px', margin: '6px 0 4px' }}>{t('roi.title')}</h2>
        <p style={{ color: '#8a939a', fontSize: '14px', margin: 0 }}>{t('roi.lede')}</p>
      </div>

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ color: '#c0c8cd', fontSize: '13px' }}>Purchase price (USD)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="roi-price"
              type="number"
              min={1}
              step={10000}
              value={price}
              onChange={(e) => setPrice(Math.max(1, Number(e.target.value)))}
              style={{
                flex: 1,
                background: '#0d1114',
                border: '1px solid #2a3238',
                borderRadius: '6px',
                color: '#e8ebed',
                padding: '10px 12px',
                fontSize: '15px',
              }}
            />
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ color: '#c0c8cd', fontSize: '13px' }}>{t('roi.nightlyRate')}: <strong style={{ color: '#e8ebed' }}>{fmtUsd(nightly)}</strong></span>
          <input
            id="roi-nightly"
            type="range"
            min={30}
            max={1000}
            step={10}
            value={nightly}
            onChange={(e) => setNightly(Number(e.target.value))}
            style={{ accentColor: '#c8a24b', width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568', fontSize: '11px' }}>
            <span>$30</span><span>$1,000</span>
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ color: '#c0c8cd', fontSize: '13px' }}>{t('roi.occupancy')}: <strong style={{ color: '#e8ebed' }}>{occupancy}%</strong></span>
          <input
            id="roi-occupancy"
            type="range"
            min={20}
            max={95}
            step={5}
            value={occupancy}
            onChange={(e) => setOccupancy(Number(e.target.value))}
            style={{ accentColor: '#c8a24b', width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568', fontSize: '11px' }}>
            <span>20%</span><span>95%</span>
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ color: '#c0c8cd', fontSize: '13px' }}>{t('roi.mgmtFee')}: <strong style={{ color: '#e8ebed' }}>{mgmt}%</strong></span>
          <input
            id="roi-mgmt"
            type="range"
            min={0}
            max={35}
            step={5}
            value={mgmt}
            onChange={(e) => setMgmt(Number(e.target.value))}
            style={{ accentColor: '#c8a24b', width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568', fontSize: '11px' }}>
            <span>0%</span><span>35%</span>
          </div>
        </label>
      </div>

      {/* Results */}
      <div
        style={{
          marginTop: '24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        {[
          { label: t('roi.grossYield'), value: fmtPct(grossYield), color: yieldColor },
          { label: t('roi.netYield'), value: fmtPct(netYield), color: yieldColor },
          { label: 'Gross annual income', value: fmtUsd(grossAnnual), color: '#e8ebed' },
          { label: t('roi.monthlyNet'), value: fmtUsd(monthlyNet), color: '#e8ebed' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: '#0d1114',
              border: '1px solid #2a3238',
              borderRadius: '8px',
              padding: '14px 16px',
            }}
          >
            <div style={{ color: '#8a939a', fontSize: '12px', marginBottom: '4px' }}>{label}</div>
            <div style={{ color, fontSize: '20px', fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>

      <p style={{ margin: '16px 0 4px', color: '#c8a24b', fontSize: '12px' }}>{t('roi.marketRange')}</p>
      <p style={{ margin: 0, color: '#4a5568', fontSize: '11px' }}>{t('roi.disclaimer')}</p>
    </section>
  );
}
