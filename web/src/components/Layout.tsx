import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LanguageToggle, useLang } from '../i18n';
import { useAuth } from '../auth';
import { api } from '../api';
import { canViewAnalytics } from '../permissions';
import { analyticsPath, profilePath } from '../routes';
import { GlobeMark } from './Logo';
import NewsletterPrompt from './NewsletterPrompt';

function ThemeToggle() {
  const [theme, setTheme] = useState<string>(() => {
    try { return localStorage.getItem('meridian_theme') ?? 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('meridian_theme', theme); } catch { /* ignore */ }
  }, [theme]);
  return (
    <button
      className="linkish icon-btn"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  );
}

export default function Layout() {
  const { t, lang } = useLang();
  const { user, logout } = useAuth();
  const canAnalytics = canViewAnalytics(user?.role);
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [needsPlan, setNeedsPlan] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.search]);

  // ── Plan gate: signed-in users without a subscription must choose a plan ──
  useEffect(() => {
    if (!user) { setNeedsPlan(false); return; }
    let cancelled = false;
    const check = () => {
      api.get<{ subscription: unknown | null }>('/api/plans/my')
        .then((d) => { if (!cancelled) setNeedsPlan(d.subscription === null); })
        .catch(() => { /* non-critical */ });
    };
    check();
    const onSelected = () => setNeedsPlan(false);
    window.addEventListener('meridian:plan-selected', onSelected);
    return () => { cancelled = true; window.removeEventListener('meridian:plan-selected', onSelected); };
  }, [user]);

  useEffect(() => {
    if (!user || !needsPlan) return;
    const allowed = ['/choose-plan', '/pricing', '/contact', '/signup/success'];
    if (!allowed.includes(location.pathname)) {
      navigate('/choose-plan', { replace: true });
    }
  }, [user, needsPlan, location.pathname, navigate]);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let cancelled = false;
    const load = () => {
      api.get<{ unread: number }>('/api/messages/unread-count')
        .then((d) => { if (!cancelled) setUnread(d.unread); })
        .catch(() => { /* non-critical */ });
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [user]);

  return (
    <>
      <a href="#main" className="visually-hidden" style={{ position: 'absolute', left: -9999 }}>{t('layout.skip')}</a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="Meridian home">
            <GlobeMark />
            <span className="brand-name">Meridian</span>
          </Link>
          <button
            className="nav-toggle icon-btn"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuOpen
                ? <path d="M6 6l12 12M18 6L6 18" />
                : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <nav id="site-nav" className={`nav${menuOpen ? ' open' : ''}`} aria-label="Main">
            <NavLink to="/search?listingType=sale">{t('nav.buy')}</NavLink>
            <NavLink to="/search?listingType=rent">{t('nav.rent')}</NavLink>
            <NavLink to="/pricing">{t('nav.pricing')}</NavLink>
            <NavLink to="/blog">{lang === 'en' ? 'Blog' : 'Blog'}</NavLink>
            <NavLink to="/agents">{t('nav.agents')}</NavLink>
            {user && <NavLink to="/dashboard">{t('nav.dashboard')}</NavLink>}
            {user && canAnalytics && <NavLink to={analyticsPath()}>{t('dash.analytics')}</NavLink>}
            {user && user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
            {user && <NavLink to={profilePath()}>{t('dash.profile')}</NavLink>}
            {!user && <NavLink to="/login" id="nav-signin-btn">{t('nav.login')}</NavLink>}
            {!user && <NavLink to="/signup" className="gold" id="nav-signup-btn">{t('nav.signup')}</NavLink>}
            {user && (
              <button className="linkish" onClick={() => { logout(); navigate('/'); }}>
                {t('nav.logout')}
              </button>
            )}
            <ThemeToggle />
            <LanguageToggle />
            {user && (
              <NavLink to="/favorites" className="icon-btn" aria-label={t('nav.favorites')} title={t('nav.favorites')}>
                ♡
              </NavLink>
            )}
            {user && (
              <NavLink to="/messages" className="icon-btn" aria-label={t('nav.messages')} title={t('nav.messages')} style={{ position: 'relative' }}>
                💬
                {unread > 0 && (
                  <span className="badge" style={{ position: 'absolute', top: -4, right: -6 }}>{unread}</span>
                )}
              </NavLink>
            )}
          </nav>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <NewsletterPrompt />
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="brand" style={{ marginBottom: 16 }}>
                <GlobeMark size={30} />
                <span className="brand-name" style={{ fontSize: '1.45rem' }}>Meridian</span>
              </div>
              <p style={{ maxWidth: '38ch', margin: '0 0 12px', lineHeight: 1.7 }}>{t('footer.tag')}</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                Santo Domingo, República Dominicana
              </p>
            </div>
            <nav aria-label="Footer navigation" className="footer-links">
              <div>
                <p className="footer-nav-head">{t('footer.realestate')}</p>
                <Link to="/search">{t('footer.browse')}</Link>
                <Link to="/search?sort=newest">{t('footer.newdev')}</Link>
                <Link to="/dashboard/new">{t('hero.cta.list')}</Link>
              </div>
              <div>
                <p className="footer-nav-head">{t('footer.company')}</p>
                <Link to="/contact">{t('footer.contact')}</Link>
                <Link to="/pricing">{t('nav.pricing')}</Link>
                <Link to="/signup">{t('nav.signup')}</Link>
              </div>
              <div>
                <p className="footer-nav-head">{t('footer.resources')}</p>
                <Link to="/market-index">{lang === 'en' ? 'DR Price Index ($/m²)' : 'Índice de Precios ($/m²)'}</Link>
                <Link to="/blog">{lang === 'en' ? 'DR Real Estate Guides' : 'Guías Inmobiliarias RD'}</Link>
                <a href="mailto:info@investwithmeridian.com">info@investwithmeridian.com</a>
                <a href="https://wa.me/14707089223" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <Link to="/contact">{t('footer.legal')}</Link>
                <Link to="/terms">{t('footer.terms')}</Link>
                <Link to="/privacy">{t('footer.privacy')}</Link>
              </div>
            </nav>
          </div>
          <div className="footer-bottom">
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              © {new Date().getFullYear()} Meridian Real Estate. {t('footer.rights')}
            </p>
            <div className="social-row">
              <a className="social-circle" href="https://www.facebook.com/meridiandr" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3V11H9v3h2.3v7h2.2z"/></svg>
              </a>
              <a className="social-circle" href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4.1 4.1 0 0 0 11.8 9 11.7 11.7 0 0 1 3.3 4.7a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4a4.2 4.2 0 0 1-1.9.1 4.1 4.1 0 0 0 3.9 2.9A8.3 8.3 0 0 1 2 18.5a11.7 11.7 0 0 0 6.3 1.8c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.2z"/></svg>
              </a>
              <a className="social-circle" href="https://www.instagram.com/meridian.dr" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
