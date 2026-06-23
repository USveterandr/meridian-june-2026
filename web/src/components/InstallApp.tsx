import { useEffect, useState } from 'react';
import { useLang } from '../i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallApp() {
  const { t } = useLang();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* non-critical */ });
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!installEvent && !isIos()) return null;

  async function onInstallClick() {
    if (!installEvent) { setShowIosHelp(true); return; }
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallEvent(null);
  }

  return (
    <section className="section" style={{ background: 'var(--surface)' }}>
      <div className="container" style={{ maxWidth: 680, textAlign: 'center' }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>{t('install.eyebrow')}</p>
        <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', marginBottom: 14 }}>
          {t('install.title')} <span className="gold">{t('install.titleGold')}</span>
        </h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.7 }}>{t('install.lede')}</p>
        <button className="btn gold" type="button" onClick={isIos() ? () => setShowIosHelp(true) : onInstallClick}>
          {t('install.cta')}
        </button>
        {showIosHelp && (
          <div
            style={{
              marginTop: 20,
              padding: '16px 20px',
              border: '1px solid var(--border)',
              maxWidth: 420,
              margin: '20px auto 0',
              textAlign: 'left',
              fontSize: '0.9rem',
              lineHeight: 1.7,
              color: 'var(--text-dim)',
            }}
          >
            <strong style={{ color: 'var(--text)' }}>{t('install.ios.title')}</strong>
            <ol style={{ margin: '10px 0 0', paddingLeft: 20 }}>
              <li>{t('install.ios.step1')}</li>
              <li>{t('install.ios.step2')}</li>
              <li>{t('install.ios.step3')}</li>
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
