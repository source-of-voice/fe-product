import { Globe2, Loader2, LockKeyhole, Mic2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Field, InfoPill } from '../components/ui';
import type { Notice } from '../types/ui';

interface AuthPageProps {
  mode: 'login' | 'register';
  setMode: (mode: 'login' | 'register') => void;
  credentials: { email: string; password: string };
  setCredentials: (credentials: { email: string; password: string }) => void;
  busy: boolean;
  notice: Notice;
  submitAuth: () => void;
  setLanguage: (language: 'en' | 'pl') => void;
}

export function AuthPage({ mode, setMode, credentials, setCredentials, busy, notice, submitAuth, setLanguage }: AuthPageProps) {
  const { t, i18n } = useTranslation();

  return (
    <main className="auth-page">
      <section className="auth-hero glass-shell">
        <div className="logo-mark"><Mic2 size={30} /></div>

        <h1>{t('appName')}</h1>
        <p className="page-subtitle"></p>
        <div className="feature-grid compact-grid">
          <InfoPill icon={<Sparkles size={18} />} label={ "SOFV"} />
          <InfoPill icon={<Globe2 size={18} />} label="EN / PL" />
        </div>
      </section>

      <section className="auth-panel glass-card">
        <div className="language-switcher compact">
          <button onClick={() => setLanguage('en')} className={i18n.language === 'en' ? 'active' : ''}>{t('english')}</button>
          <button onClick={() => setLanguage('pl')} className={i18n.language === 'pl' ? 'active' : ''}>{t('polish')}</button>
        </div>

        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>{t('login')}</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>{t('register')}</button>
        </div>

        <div className="form-stack">
          <Field label={t('email')}>
            <input type="email" value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} />
          </Field>
          <Field label={t('password')}>
            <input type="password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} />
          </Field>
        </div>

        <button className="primary-button full" onClick={submitAuth} disabled={busy || !credentials.email || !credentials.password}>
          {busy ? <Loader2 size={18} className="spin" /> : <LockKeyhole size={18} />}
          <span>{busy ? t('loading') : mode === 'login' ? t('login') : t('register')}</span>
        </button>
        {notice && <p className={`notice notice--${notice.kind}`}>{notice.message}</p>}
      </section>
    </main>
  );
}
