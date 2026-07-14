/**
 * /market-index — DR Real Estate Price Index
 *
 * Public page (no auth required). Shows median $/m² by city fetched from
 * the live inventory API. Doubles as an SEO landing page for queries like
 * "Dominican Republic real estate price per m2" and "DR condo $/sqm".
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useLang } from '../i18n';

interface IndexEntry {
  city: string;
  medianPricePerM2: number;
  count: number;
  minPricePerM2: number;
  maxPricePerM2: number;
}

interface ApiResponse {
  results: IndexEntry[];
  total: number;
  generatedAt: string;
  note: string;
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      style={{
        height: '6px',
        background: '#1a2228',
        borderRadius: '3px',
        overflow: 'hidden',
        marginTop: '6px',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg,#c8a24b,#e0be6a)',
          borderRadius: '3px',
          transition: 'width 0.6s ease',
        }}
      />
    </div>
  );
}

export default function MarketIndex() {
  const { t, lang } = useLang();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t('market.h1')} | Meridian`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t('market.lede'));
    }
  }, [lang, t]);

  useEffect(() => {
    setLoading(true);
    api.get<ApiResponse>('/api/market/price-per-m2')
      .then(setData)
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false));
  }, []);

  const maxMedian = data ? Math.max(...data.results.map((r) => r.medianPricePerM2)) : 0;
  const generatedDate = data?.generatedAt
    ? new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(data.generatedAt))
    : null;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0d1114',
        color: '#e8ebed',
        fontFamily: "'Georgia', serif",
        padding: '0 0 80px',
      }}
    >
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg,#12191e 0%,#0d1114 100%)',
          borderBottom: '1px solid #1e2a32',
          padding: '60px 24px 48px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#c8a24b',
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          {t('market.eyebrow')}
        </p>
        <h1
          style={{
            fontSize: 'clamp(22px,5vw,38px)',
            fontWeight: 400,
            margin: '0 0 16px',
            lineHeight: 1.25,
          }}
        >
          {t('market.h1')}
        </h1>
        <p
          style={{
            maxWidth: '680px',
            margin: '0 auto 24px',
            color: '#8a939a',
            lineHeight: 1.7,
            fontSize: '16px',
          }}
        >
          {t('market.lede')}
        </p>
        {generatedDate && (
          <p style={{ color: '#4a5568', fontSize: '12px' }}>
            {t('market.updated')}: {generatedDate}
          </p>
        )}
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 0' }}>

        {loading && (
          <div style={{ textAlign: 'center', color: '#8a939a', padding: '60px 0' }}>
            {t('common.loading')}
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', color: '#e07070', padding: '60px 0' }}>
            {error}
          </div>
        )}

        {data && data.results.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8a939a', padding: '60px 0' }}>
            {t('market.noData')}
          </div>
        )}

        {data && data.results.length > 0 && (
          <>
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 200px 80px',
                gap: '8px',
                padding: '10px 16px',
                color: '#4a5568',
                fontSize: '12px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderBottom: '1px solid #1e2a32',
              }}
            >
              <span>{t('market.col.city')}</span>
              <span style={{ textAlign: 'right' }}>{t('market.col.median')}</span>
              <span style={{ textAlign: 'center' }}>{t('market.col.range')}</span>
              <span style={{ textAlign: 'right' }}>{t('market.col.listings')}</span>
            </div>

            {/* Rows */}
            {data.results.map((entry, i) => (
              <div
                key={entry.city}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 200px 80px',
                  gap: '8px',
                  padding: '14px 16px',
                  borderBottom: '1px solid #1a2228',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#12191e')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* City + bar */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {i < 3 && (
                      <span
                        style={{
                          fontSize: '10px',
                          background: '#c8a24b22',
                          color: '#c8a24b',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontFamily: 'sans-serif',
                        }}
                      >
                        #{i + 1}
                      </span>
                    )}
                    <Link
                      to={`/search?city=${encodeURIComponent(entry.city)}`}
                      style={{ color: '#e8ebed', textDecoration: 'none', fontSize: '15px' }}
                    >
                      {entry.city}
                    </Link>
                  </div>
                  <Bar value={entry.medianPricePerM2} max={maxMedian} />
                </div>

                {/* Median */}
                <div style={{ textAlign: 'right', color: '#c8a24b', fontSize: '16px', fontWeight: 600 }}>
                  ${entry.medianPricePerM2.toLocaleString()}
                </div>

                {/* Range */}
                <div style={{ textAlign: 'center', color: '#8a939a', fontSize: '13px', fontFamily: 'sans-serif' }}>
                  ${entry.minPricePerM2.toLocaleString()} – ${entry.maxPricePerM2.toLocaleString()}
                </div>

                {/* Listings count */}
                <div style={{ textAlign: 'right', color: '#4a5568', fontSize: '13px', fontFamily: 'sans-serif' }}>
                  {entry.count}
                </div>
              </div>
            ))}

            {/* Data note */}
            <p
              style={{
                color: '#4a5568',
                fontSize: '12px',
                fontFamily: 'sans-serif',
                marginTop: '24px',
                lineHeight: 1.6,
              }}
            >
              {data.note}
            </p>
          </>
        )}

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '40px',
            justifyContent: 'center',
          }}
        >
          <Link
            to="/search"
            style={{
              background: 'linear-gradient(135deg,#c8a24b,#e0be6a)',
              color: '#0d1114',
              padding: '14px 28px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontFamily: 'sans-serif',
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            {t('market.cta')}
          </Link>
          <Link
            to="/blog/dr-rental-yields-roi-2026"
            style={{
              border: '1px solid #2a3238',
              color: '#c8a24b',
              padding: '14px 28px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontFamily: 'sans-serif',
              fontSize: '15px',
            }}
          >
            {t('market.guideCta')}
          </Link>
        </div>
      </div>
    </main>
  );
}
