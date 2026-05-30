import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioLines, Gauge, Headphones, Languages, LogOut, Mic2, UserCog, Users, WalletCards, WandSparkles } from 'lucide-react';
import { authApi } from './api/sourceOfVoiceApi';
import { clearTokens, getCurrentUser, readTokens, saveTokens } from './auth/token';
import { NavButton } from './components/ui';
import { useAutoDismissMessage } from './hooks/useAutoDismissMessage';
import { AdminTextPage } from './pages/AdminTextPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AudioPage } from './pages/AudioPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReviewerPage } from './pages/ReviewerPage';
import { WalletPage } from './pages/WalletPage';
import type { Role } from './types/domain';
import type { Notice, View } from './types/ui';
import { languageCodeFromI18n } from './utils/format';
import { getUserFriendlyErrorMessage } from './utils/errors';

const VIEW_STORAGE_KEY = 'sov.activeView';

type StoredView = View | 'tasks' | 'admin' | 'settings' | null;

function normalizeView(value: StoredView): View {
  if (value === 'tasks') return 'audio';
  if (value === 'admin') return 'adminTexts';
  if (value === 'settings') return 'profile';
  if (
    value === 'dashboard'
    || value === 'audio'
    || value === 'reviewer'
    || value === 'wallet'
    || value === 'adminTexts'
    || value === 'adminUsers'
    || value === 'profile'
  ) {
    return value;
  }
  return 'dashboard';
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setAuthenticated] = useState(Boolean(readTokens()));
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [view, setViewState] = useState<View>(() => normalizeView(localStorage.getItem(VIEW_STORAGE_KEY) as StoredView));
  const [notice, setNotice] = useState<Notice>(null);
  useAutoDismissMessage(notice, setNotice, 5000);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const currentUser = useMemo(() => getCurrentUser(), [isAuthenticated, notice]);
  const roles = currentUser.roles.length ? currentUser.roles : (['USER'] as Role[]);

  const setView = (nextView: View) => {
    setViewState(nextView);
    localStorage.setItem(VIEW_STORAGE_KEY, nextView);
  };

  const setLanguage = (language: 'en' | 'pl') => {
    localStorage.setItem('sov.language', language);
    i18n.changeLanguage(language);
  };

  const submitAuth = async () => {
    setBusy(true);
    setNotice(null);
    try {
      if (mode === 'register') {
        await authApi.register(credentials);
        setNotice({ kind: 'success', message: t('registered') });
        setMode('login');
      } else {
        const tokens = await authApi.login(credentials);
        saveTokens(tokens);
        setAuthenticated(true);
        setCredentials({ email: '', password: '' });
        setNotice({ kind: 'success', message: t('loggedIn') });
      }
    } catch (error) {
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Local logout is still correct when the access token is already expired.
    } finally {
      clearTokens();
      setAuthenticated(false);
      localStorage.removeItem(VIEW_STORAGE_KEY);
      setView('dashboard');
    }
  };

  if (!isAuthenticated) {
    return (
      <AuthPage
        mode={mode}
        setMode={setMode}
        credentials={credentials}
        setCredentials={setCredentials}
        busy={busy}
        notice={notice}
        submitAuth={submitAuth}
        setLanguage={setLanguage}
      />
    );
  }

  return (
    <main className="app-page">
      <div className="app-container">
        <div className="app-workspace">
          <aside className="sidebar-surface sidebar">
            <div className="brand-row">
              <div className="logo-mark"><Mic2 size={23} /></div>
              <div>
                <strong>{t('appName')}</strong>

              </div>
            </div>

            <nav className="side-nav">
              <NavButton active={view === 'dashboard'} icon={<Gauge size={18} />} label={t('dashboard')} onClick={() => setView('dashboard')} />
              <NavButton active={view === 'audio'} icon={<AudioLines size={18} />} label={t('tasks')} onClick={() => setView('audio')} />
              {roles.includes('REVIEWER') && <NavButton active={view === 'reviewer'} icon={<Headphones size={18} />} label={t('reviewer')} onClick={() => setView('reviewer')} />}
              <NavButton active={view === 'wallet'} icon={<WalletCards size={18} />} label={t('wallet')} onClick={() => setView('wallet')} />
              {roles.includes('ADMIN') && <NavButton active={view === 'adminTexts'} icon={<WandSparkles size={18} />} label={t('adminTexts')} onClick={() => setView('adminTexts')} />}
              {roles.includes('ADMIN') && <NavButton active={view === 'adminUsers'} icon={<Users size={18} />} label={t('adminUsersShort')} onClick={() => setView('adminUsers')} />}
              <NavButton active={view === 'profile'} icon={<UserCog size={18} />} label={t('settings')} onClick={() => setView('profile')} />
            </nav>

            <div className="sidebar-footer">
              <div className="language-switcher">
                <Languages size={17} />
                <button onClick={() => setLanguage('en')} className={i18n.language === 'en' ? 'active' : ''}>EN</button>
                <button onClick={() => setLanguage('pl')} className={i18n.language === 'pl' ? 'active' : ''}>PL</button>
              </div>
              <button className="ghost-button danger" onClick={logout}><LogOut size={18} /> <span>{t('logout')}</span></button>
            </div>
          </aside>

          <section className="main-workspace">
            <header className="glass-shell page-header">
              <div>
                <p className="eyebrow">{t('sourceOfVoiceWorkspace')}</p>
                <h1 className="page-title">{titleForView(view, t)}</h1>
                <p className="page-subtitle">{subtitleForView(view, t)}</p>
              </div>
            </header>

            {notice && <p className={`notice notice--${notice.kind}`}>{notice.message}</p>}

            {view === 'dashboard' && <DashboardPage setView={setView} />}
            {view === 'audio' && <AudioPage language={languageCodeFromI18n(i18n.language)} setNotice={setNotice} />}
            {view === 'reviewer' && <ReviewerPage setNotice={setNotice} />}
            {view === 'wallet' && <WalletPage />}
            {view === 'adminTexts' && <AdminTextPage setNotice={setNotice} />}
            {view === 'adminUsers' && <AdminUsersPage setNotice={setNotice} />}
            {view === 'profile' && <ProfilePage setNotice={setNotice} />}
          </section>
        </div>
      </div>
    </main>
  );
}

function titleForView(view: View, t: (key: string) => string) {
  const titles: Record<View, string> = {
    dashboard: t('dashboard'),
    audio: t('tasks'),
    reviewer: t('reviewerPanel'),
    wallet: t('wallet'),
    adminTexts: t('adminTexts'),
    adminUsers: t('adminUsers'),
    profile: t('settings')
  };
  return titles[view];
}

function subtitleForView(view: View, t: (key: string) => string) {
  const subtitles: Record<View, string> = {
    dashboard: t('dashboardSubtitle'),
    audio: t('tasksSubtitle'),
    reviewer: t('reviewerSubtitle'),
    wallet: t('walletSubtitle'),
    adminTexts: t('adminTextsSubtitle'),
    adminUsers: t('adminUsersSubtitle'),
    profile: t('settingsSubtitle')
  };
  return subtitles[view];
}
