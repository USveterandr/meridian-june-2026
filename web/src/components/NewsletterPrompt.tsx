import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { useLang } from '../i18n';

// Site-wide newsletter capture: a dismissible slide-in card (bottom corner),
// NOT a blocking modal — Google treats intrusive interstitials as a negative
// signal, and corner prompts convert without infuriating people.
//
// Shows once per visitor after 15s on page or 35% scroll, whichever first.
// Never shows again after subscribing; a dismiss snoozes it for 7 days.
// Skipped on auth/checkout flows where it would compete with the real CTA.

const DONE_KEY = 'meridian_nl_subscribed';
const SNOOZE_KEY = 'meridian_nl_snoozed_at';
const SNOOZE_DAYS = 7;
const SKIP_PATHS = ['/login', '/signup', '/checkout', '/choose-plan'];

function shouldOffer(pathname: string): boolean {
  if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return false;
  try {
    if (localStorage.getItem(DONE_KEY)) return false;
    const snoozed = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (snoozed && Date.now() - snoozed < SNOOZE_DAYS * 86_400_000) return false;
  } catch { /* private mode: fall through, worst case it shows */ }
  return true;
}

export default function NewsletterPrompt() {
  const { t, lang } = useLang();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (visible || !shouldOffer(location.pathname)) return;
    let fired = false;
    const show = () => {
      if (fired) return;
      fired = true;
      window.removeEventListener('scroll', onScroll);
      // Re-check the path at fire time (user may have navigated to /signup).
      if (shouldOffer(window.location.pathname)) setVisible(true);
    };
    const onScroll = () => {
      const scrolled = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
      if (scrolled > 0.35) show();
    };
    const timer = window.setTimeout(show, 15_000);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;
    setStatus('loading');
    try {
      await api.post('/api/newsletter', { email: email.trim(), lang });
      setStatus('success');
      try { localStorage.setItem(DONE_KEY, '1'); } catch { /* ignore */ }
      window.setTimeout(() => setVisible(false), 2500);
    } catch {
      setStatus('error');
    }
  }

  if (!visible) return null;

  return (
    <aside className="nl-prompt" role="dialog" aria-label={t('newsletter.title')}>
      <button className="nl-prompt-close" onClick={dismiss} aria-label={t('common.cancel')}>×</button>
      {status === 'success' ? (
        <p className="nl-prompt-success">{t('newsletter.success')}</p>
      ) : (
        <>
          <p className="nl-prompt-eyebrow">{t('newsletter.eyebrow')}</p>
          <p className="nl-prompt-title">
            {lang === 'en' ? 'The DR market, before everyone else.' : 'El mercado dominicano, antes que nadie.'}
          </p>
          <p className="nl-prompt-lede">
            {lang === 'en'
              ? 'New listings and the weekly Market Pulse — free, every Monday.'
              : 'Nuevas propiedades y el Pulso del Mercado semanal — gratis, cada lunes.'}
          </p>
          <form onSubmit={onSubmit} className="nl-prompt-form">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('newsletter.placeholder')}
              aria-label={t('newsletter.placeholder')}
              autoComplete="email"
              disabled={status === 'loading'}
            />
            <button className="btn gold small" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? t('newsletter.submitting') : t('newsletter.submit')}
            </button>
          </form>
          {status === 'error' && <p className="nl-prompt-error">{t('newsletter.error')}</p>}
          <p className="nl-prompt-note">{t('newsletter.unsubscribe')}</p>
        </>
      )}
    </aside>
  );
}
