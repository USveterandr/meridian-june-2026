import { useState, type CSSProperties } from 'react';
import { useLang } from '../i18n';

type Props = { url: string; title: string };

export default function ShareButtons({ url, title }: Props) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: '💬',
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: 'f',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      key: 'x',
      label: 'X',
      icon: '𝕏',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      key: 'email',
      label: t('detail.share.email'),
      icon: '✉',
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable; ignore */
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* user cancelled or unsupported; ignore */
      }
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span className="meta" style={{ marginRight: 2 }}>{t('detail.share.label')}</span>
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
          title={l.label}
          style={shareIconStyle}
        >
          {l.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label={t('detail.share.copy')}
        title={t('detail.share.copy')}
        style={shareIconStyle}
      >
        {copied ? '✓' : '🔗'}
      </button>
      {typeof navigator !== 'undefined' && Boolean(navigator.share) && (
        <button
          type="button"
          onClick={nativeShare}
          aria-label={t('detail.share.more')}
          title={t('detail.share.more')}
          style={shareIconStyle}
        >
          ⋯
        </button>
      )}
    </div>
  );
}

const shareIconStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: '50%',
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: '0.95rem',
  textDecoration: 'none',
};
