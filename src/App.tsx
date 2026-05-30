import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AudioLines,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Coins,
  Gauge,
  Globe2,
  Headphones,
  Languages,
  ListFilter,
  Loader2,
  LockKeyhole,
  LogOut,
  Mic2,
  Pause,
  Play,
  Search,
  Sparkles,
  Upload,
  UserCog,
  WalletCards,
  WandSparkles,
  X
} from 'lucide-react';
import { adminTextApi, audioApi, authApi, reviewerApi, textApi, walletApi } from './api/sourceOfVoiceApi';
import { clearTokens, getCurrentUser, readTokens, saveTokens } from './auth/token';
import { StatusBadge } from './components/StatusBadge';
import type {
  AdminAudioTextBatchListItemResponse,
  AdminAudioTextListItemResponse,
  AudioSubmissionResponse,
  AudioTextStatus,
  GenerateWikipediaTextsRequest,
  ReviewerAudioSubmissionDetailsResponse,
  Role,
  SliceResponse,
  UserAudioTextDetailsResponse,
  UserAudioTextListItemResponse,
  WalletResponse,
  WalletTransactionResponse
} from './types/domain';

type View = 'dashboard' | 'tasks' | 'reviewer' | 'wallet' | 'admin' | 'settings';
type Notice = { kind: 'success' | 'error'; message: string } | null;
type TaskSort = 'default' | 'priceDesc' | 'difficultyAsc' | 'difficultyDesc' | 'wordsAsc' | 'wordsDesc';

const emptySlice = <T,>(): SliceResponse<T> => ({
  content: [],
  page: 0,
  size: 20,
  first: true,
  last: true,
  hasNext: false,
  numberOfElements: 0
});

function toneForStatus(status?: string | null): 'neutral' | 'success' | 'warning' | 'danger' {
  if (!status) return 'neutral';
  if (status.includes('APPROVED') || status.includes('ACTIVE') || status.includes('FINISHED')) return 'success';
  if (status.includes('REJECTED') || status.includes('DISABLED') || status.includes('FAILED') || status.includes('ARCHIVED')) return 'danger';
  if (status.includes('REVIEW') || status.includes('SUBMITTED') || status.includes('RUNNING')) return 'warning';
  return 'neutral';
}

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return `${value} PLN`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function languageCodeFromI18n(language: string) {
  return language.toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

function fileSize(bytes: number) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const VIEW_STORAGE_KEY = 'sov.activeView';
const ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/aac', 'audio/ogg', 'audio/amr', 'audio/mp4', 'audio/flac'];
const ALLOWED_AUDIO_EXTENSIONS = ['wav', 'mp3', 'mpeg', 'aac', 'ogg', 'oga', 'amr', 'm4a', 'mp4', 'flac'];
const AUDIO_ACCEPT = ALLOWED_AUDIO_TYPES.join(',');
const RECORDING_MIME_CANDIDATES = [
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/aac'
];

function isView(value: string | null): value is View {
  return value === 'dashboard' || value === 'tasks' || value === 'reviewer' || value === 'wallet' || value === 'admin' || value === 'settings';
}

function normalizeAudioType(type: string | undefined | null) {
  return (type ?? '').split(';')[0].trim().toLowerCase();
}

function extensionForAudioType(type: string) {
  switch (normalizeAudioType(type)) {
    case 'audio/wav': return 'wav';
    case 'audio/mpeg': return 'mp3';
    case 'audio/aac': return 'aac';
    case 'audio/ogg': return 'ogg';
    case 'audio/amr': return 'amr';
    case 'audio/mp4': return 'm4a';
    case 'audio/flac': return 'flac';
    default: return 'audio';
  }
}

function getFileExtension(fileName: string) {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

function isAllowedAudioFile(file: File) {
  const normalizedType = normalizeAudioType(file.type);
  const extension = getFileExtension(file.name);
  return ALLOWED_AUDIO_TYPES.includes(normalizedType) || ALLOWED_AUDIO_EXTENSIONS.includes(extension);
}

function pickRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return RECORDING_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function downloadRecordedFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setAuthenticated] = useState(Boolean(readTokens()));
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [view, setViewState] = useState<View>(() => {
    const storedView = localStorage.getItem(VIEW_STORAGE_KEY);
    return isView(storedView) ? storedView : 'dashboard';
  });
  const [notice, setNotice] = useState<Notice>(null);
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
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
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
      <main className="auth-page">
        <section className="auth-hero glass-shell">
          <div className="logo-mark"><Mic2 size={30} /></div>
          <p className="eyebrow">{t('dockerReady')}</p>
          <h1>{t('appName')}</h1>
          <p className="page-subtitle">{t('appSubtitle')}</p>
          <div className="feature-grid compact-grid">
            <InfoPill icon={<Sparkles size={18} />} label={t('secureByDesign')} />
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

  return (
    <main className="app-page">
      <div className="app-container">
        <div className="app-workspace">
          <aside className="sidebar-surface sidebar">
            <div className="brand-row">
              <div className="logo-mark"><Mic2 size={23} /></div>
              <div>
                <strong>{t('appName')}</strong>
                <span>{t('minimalClient')}</span>
              </div>
            </div>

            <nav className="side-nav">
              <NavButton active={view === 'dashboard'} icon={<Gauge size={18} />} label={t('dashboard')} onClick={() => setView('dashboard')} />
              <NavButton active={view === 'tasks'} icon={<AudioLines size={18} />} label={t('tasks')} onClick={() => setView('tasks')} />
              {roles.includes('REVIEWER') && <NavButton active={view === 'reviewer'} icon={<Headphones size={18} />} label={t('reviewer')} onClick={() => setView('reviewer')} />}
              <NavButton active={view === 'wallet'} icon={<WalletCards size={18} />} label={t('wallet')} onClick={() => setView('wallet')} />
              {roles.includes('ADMIN') && <NavButton active={view === 'admin'} icon={<WandSparkles size={18} />} label={t('adminPanel')} onClick={() => setView('admin')} />}
              <NavButton active={view === 'settings'} icon={<UserCog size={18} />} label={t('settings')} onClick={() => setView('settings')} />
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

            {view === 'dashboard' && <DashboardView setView={setView} />}
            {view === 'tasks' && <TasksView language={languageCodeFromI18n(i18n.language)} setNotice={setNotice} />}
            {view === 'reviewer' && <ReviewerView setNotice={setNotice} />}
            {view === 'wallet' && <WalletView />}
            {view === 'admin' && <AdminView setNotice={setNotice} />}
            {view === 'settings' && <SettingsView setNotice={setNotice} />}
          </section>
        </div>
      </div>
    </main>
  );
}

function titleForView(view: View, t: (key: string) => string) {
  const titles: Record<View, string> = {
    dashboard: t('dashboard'),
    tasks: t('tasks'),
    reviewer: t('reviewerPanel'),
    wallet: t('wallet'),
    admin: t('adminPanel'),
    settings: t('settings')
  };
  return titles[view];
}

function subtitleForView(view: View, t: (key: string) => string) {
  const titles: Record<View, string> = {
    dashboard: t('dashboardSubtitle'),
    tasks: t('tasksSubtitle'),
    reviewer: t('reviewerSubtitle'),
    wallet: t('walletSubtitle'),
    admin: t('adminSubtitle'),
    settings: t('settingsSubtitle')
  };
  return titles[view];
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field-block">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="info-pill">
      {icon}
      <span>{label}</span>
    </span>
  );
}

function StatCard({ icon, label, value, action }: { icon: ReactNode; label: string; value: string; action?: ReactNode }) {
  return (
    <article className="glass-card stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      {action && <div className="stat-action">{action}</div>}
    </article>
  );
}

function DashboardView({ setView }: { setView: (view: View) => void }) {
  const { t } = useTranslation();
  return (
    <div className="dashboard-grid">
      <StatCard icon={<AudioLines size={22} />} label={t('tasks')} value={t('browseAndRecord')} action={<button className="secondary-button small-button" onClick={() => setView('tasks')}>{t('open')}</button>} />
      <StatCard icon={<WalletCards size={22} />} label={t('wallet')} value={t('walletPreview')} action={<button className="secondary-button small-button" onClick={() => setView('wallet')}>{t('open')}</button>} />
      <section className="glass-card dashboard-copy">
        <h2>{t('whatToDoNext')}</h2>
        <p>{t('dashboardHelp')}</p>
        <div className="feature-grid">
          <InfoPill icon={<AudioLines size={18} />} label={t('pickTask')} />
          <InfoPill icon={<Mic2 size={18} />} label={t('recordOrUpload')} />
          <InfoPill icon={<WalletCards size={18} />} label={t('trackPayment')} />
        </div>
      </section>
    </div>
  );
}

function TasksView({ language, setNotice }: { language: string; setNotice: (notice: Notice) => void }) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<SliceResponse<UserAudioTextListItemResponse>>(emptySlice());
  const [submissions, setSubmissions] = useState<SliceResponse<AudioSubmissionResponse>>(emptySlice());
  const [taskPage, setTaskPage] = useState(0);
  const [submissionPage, setSubmissionPage] = useState(0);
  const [languageFilter, setLanguageFilter] = useState(language);
  const [sort, setSort] = useState<TaskSort>('default');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UserAudioTextDetailsResponse | null>(null);

  const loadTasks = async (page = taskPage) => {
    setLoading(true);
    try {
      const data = await textApi.listActive(languageFilter, page, 20);
      setTasks(data);
      setTaskPage(data.page ?? page);
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (page = submissionPage) => {
    try {
      const data = await audioApi.mySubmissions(page, 20);
      setSubmissions(data);
      setSubmissionPage(data.page ?? page);
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    }
  };

  useEffect(() => {
    setTaskPage(0);
    loadTasks(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageFilter]);

  useEffect(() => {
    loadSubmissions(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleTasks = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const filtered = normalized
      ? tasks.content.filter((task) => task.sourceTitle?.toLowerCase().includes(normalized))
      : [...tasks.content];

    return filtered.sort((a, b) => {
      switch (sort) {
        case 'priceDesc':
          return Number(b.basePrice ?? 0) - Number(a.basePrice ?? 0);
        case 'difficultyAsc':
          return Number(a.difficultyScore ?? 0) - Number(b.difficultyScore ?? 0);
        case 'difficultyDesc':
          return Number(b.difficultyScore ?? 0) - Number(a.difficultyScore ?? 0);
        case 'wordsAsc':
          return Number(a.wordCount ?? 0) - Number(b.wordCount ?? 0);
        case 'wordsDesc':
          return Number(b.wordCount ?? 0) - Number(a.wordCount ?? 0);
        default:
          return Number(a.id ?? 0) - Number(b.id ?? 0);
      }
    });
  }, [tasks.content, search, sort]);

  const openTask = async (task: UserAudioTextListItemResponse) => {
    try {
      const details = await textApi.details(task.id);
      setSelectedTask(details);
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    }
  };

  const afterSubmit = () => {
    setSelectedTask(null);
    loadSubmissions(0);
    setNotice({ kind: 'success', message: t('submittedAudio') });
  };

  return (
    <>
      <div className="tasks-layout">
        <section className="glass-card panel-section">
          <div className="section-heading roomy">
            <div>
              <p className="eyebrow-soft">{t('browseTasks')}</p>
              <h2>{t('availableTasks')}</h2>
            </div>
          </div>

          <div className="filter-row">
            <div className="search-box">
              <Search size={18} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('searchTasks')} />
            </div>
            <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
              <option value="en">English</option>
              <option value="pl">Polski</option>
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value as TaskSort)}>
              <option value="default">{t('sortDefault')}</option>
              <option value="priceDesc">{t('sortPrice')}</option>
              <option value="difficultyAsc">{t('sortDifficultyAsc')}</option>
              <option value="difficultyDesc">{t('sortDifficultyDesc')}</option>
              <option value="wordsAsc">{t('sortWordsAsc')}</option>
              <option value="wordsDesc">{t('sortWordsDesc')}</option>
            </select>
          </div>

          <div className="task-list">
            {visibleTasks.length === 0 && <EmptyState label={t('noData')} />}
            {visibleTasks.map((task) => (
              <button key={task.id} className="task-card" onClick={() => openTask(task)}>
                <div>
                  <strong>{task.sourceTitle}</strong>
                  <p>{task.wordCount} {t('words')} · {task.estimatedReadingSeconds}s · {t('difficulty')} {task.difficultyScore}</p>
                </div>
                <div className="task-price">{formatMoney(task.basePrice)}</div>
              </button>
            ))}
          </div>

          <Pagination page={taskPage} last={tasks.last} onPrevious={() => loadTasks(Math.max(0, taskPage - 1))} onNext={() => loadTasks(taskPage + 1)} />
        </section>

        <section className="glass-card panel-section">
          <div className="section-heading roomy">
            <div>
              <p className="eyebrow-soft">{t('yourWork')}</p>
              <h2>{t('mySubmissions')}</h2>
            </div>
          </div>
          <SubmissionList items={submissions.content} />
          <Pagination page={submissionPage} last={submissions.last} onPrevious={() => loadSubmissions(Math.max(0, submissionPage - 1))} onNext={() => loadSubmissions(submissionPage + 1)} />
        </section>
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSubmitted={afterSubmit}
          setNotice={setNotice}
        />
      )}
    </>
  );
}

function TaskModal({ task, onClose, onSubmitted, setNotice }: { task: UserAudioTextDetailsResponse; onClose: () => void; onSubmitted: () => void; setNotice: (notice: Notice) => void }) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isRecording) return undefined;
    const interval = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error(t('recorderUnavailable'));
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recordingMimeType = pickRecordingMimeType();
      if (!recordingMimeType) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error(t('recordingFormatUnavailable'));
      }

      chunksRef.current = [];
      setRecordedFile(null);
      setSelectedFile(null);
      setRecordingSeconds(0);

      const recorder = new MediaRecorder(stream, { mimeType: recordingMimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const normalizedType = normalizeAudioType(recorder.mimeType || recordingMimeType);
        const extension = extensionForAudioType(normalizedType);
        const blob = new Blob(chunksRef.current, { type: normalizedType });
        const file = new File([blob], `source-of-voice-recording.${extension}`, { type: normalizedType });
        setRecordedFile(file);
        downloadRecordedFile(file);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setIsRecording(false);
  };

  const upload = async () => {
    const file = selectedFile ?? recordedFile;
    if (!file) {
      setNotice({ kind: 'error', message: t('chooseOrRecord') });
      return;
    }
    if (!isAllowedAudioFile(file)) {
      setNotice({ kind: 'error', message: t('unsupportedAudioFormat') });
      return;
    }

    setSubmitting(true);
    try {
      await audioApi.submitAudio(task.id, file);
      onSubmitted();
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation">
      <section className="glass-modal task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <button className="close-button" onClick={onClose} aria-label={t('close')}><X size={20} /></button>

        <div className="modal-title-row">
          <div>
            <p className="eyebrow-soft">{t('taskDetails')}</p>
            <h2 id="task-modal-title">{task.sourceTitle}</h2>
          </div>
          <StatusBadge>{task.languageCode?.toUpperCase()}</StatusBadge>
        </div>

        <div className="task-modal-grid">
          <article className="glass-modal-section reading-panel">
            <div className="metric-row">
              <span>{task.wordCount} {t('words')}</span>
              <span>{task.estimatedReadingSeconds}s</span>
              <span>{formatMoney(task.basePrice)}</span>
              <span>{t('difficulty')} {task.difficultyScore}</span>
            </div>
            <h3>{t('textToRead')}</h3>
            <p className="reading-text">{task.content}</p>
          </article>

          <article className="glass-modal-section record-panel">
            <h3>{t('yourRecording')}</h3>
            <p className="page-subtitle">{t('recordingHelp')}</p>

            <div className={`recorder-card ${isRecording ? 'recording' : ''}`}>
              <button className="record-main-button" onClick={isRecording ? stopRecording : startRecording} type="button">
                {isRecording ? <CircleStop size={26} /> : <Mic2 size={26} />}
              </button>
              <div className="wave-area">
                <Waveform active={isRecording} />
                <span>{formatDuration(recordingSeconds)}</span>
              </div>
            </div>

            <label className="file-dropzone">
              <input type="file" accept={AUDIO_ACCEPT} onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && !isAllowedAudioFile(file)) {
                  setNotice({ kind: 'error', message: t('unsupportedAudioFormat') });
                  event.target.value = '';
                  return;
                }
                setSelectedFile(file);
                if (file) setRecordedFile(null);
              }} />
              <Upload size={20} />
              <span>{selectedFile?.name ?? recordedFile?.name ?? t('uploadExistingFile')}</span>
              {(selectedFile ?? recordedFile) && <small>{fileSize((selectedFile ?? recordedFile)!.size)}</small>}
            </label>

            <button className="primary-button full" onClick={upload} disabled={submitting || isRecording}>
              {submitting ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
              <span>{t('submitRecording')}</span>
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div className={`waveform ${active ? 'active' : ''}`} aria-hidden="true">
      {Array.from({ length: 34 }, (_, index) => <span key={index} style={{ animationDelay: `${index * 35}ms` }} />)}
    </div>
  );
}

function SubmissionList({ items }: { items: AudioSubmissionResponse[] }) {
  const { t } = useTranslation();
  if (!items.length) return <EmptyState label={t('noData')} />;
  return (
    <div className="submission-list">
      {items.map((item) => (
        <article key={item.id} className="compact-row">
          <div>
            <strong>{t('submission')}</strong>
            <p>{t('audioTask')}</p>
          </div>
          <div className="row-meta">
            <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge>
            <span>{formatMoney(item.payoutAmount)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function ReviewerView({ setNotice }: { setNotice: (notice: Notice) => void }) {
  const { t } = useTranslation();
  const [available, setAvailable] = useState<SliceResponse<AudioSubmissionResponse>>(emptySlice());
  const [assigned, setAssigned] = useState<SliceResponse<AudioSubmissionResponse>>(emptySlice());
  const [details, setDetails] = useState<ReviewerAudioSubmissionDetailsResponse | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [availableData, assignedData] = await Promise.all([reviewerApi.available(), reviewerApi.assigned()]);
      setAvailable(availableData);
      setAssigned(assignedData);
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (id: number) => {
    try {
      const data = await reviewerApi.details(id);
      setDetails(data);
      setAudioUrl(null);
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    }
  };

  const runAction = async (action: () => Promise<AudioSubmissionResponse>) => {
    try {
      await action();
      await load();
      setNotice({ kind: 'success', message: t('success') });
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    }
  };

  const playAudio = async (id: number) => {
    try {
      const blob = await reviewerApi.file(id);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="reviewer-grid">
      <section className="glass-card panel-section">
        <div className="section-heading roomy">
          <div>
            <p className="eyebrow-soft">{t('queue')}</p>
            <h2>{t('availableForReview')}</h2>
          </div>
        </div>
        <ReviewList items={available.content} onDetails={loadDetails} onClaim={(id) => runAction(() => reviewerApi.claim(id))} />
      </section>

      <section className="glass-card panel-section">
        <div className="section-heading roomy">
          <div>
            <p className="eyebrow-soft">{t('workspace')}</p>
            <h2>{t('assignedToMe')}</h2>
          </div>
        </div>
        <ReviewList items={assigned.content} onDetails={loadDetails} />
      </section>

      {details && (
        <section className="glass-card panel-section reviewer-details">
          <div className="section-heading roomy">
            <div>
              <p className="eyebrow-soft">{t('details')}</p>
              <h2>{details.sourceTitle ?? t('submission')}</h2>
            </div>
            <StatusBadge tone={toneForStatus(details.status)}>{details.status}</StatusBadge>
          </div>
          <div className="detail-grid">
            <article>
              
              <h3>{t('originalText')}</h3>
              <p className="long-text">{details.originalText ?? '—'}</p>
              <h3>{t('transcript')}</h3>
              <p className="long-text">{details.transcriptText ?? '—'}</p>
              {audioUrl && <audio controls src={audioUrl} className="audio-preview" />}
            </article>
            <aside className="review-actions glass-card-soft">
              <InfoPill icon={<Coins size={18} />} label={`${t('payout')}: ${formatMoney(details.payoutAmount)}`} />
              <InfoPill icon={<Gauge size={18} />} label={`${t('score')}: ${details.correctnessScore ?? '—'}`} />
              <button className="secondary-button full" onClick={() => playAudio(details.id)}><Headphones size={18} /><span>{t('playAudio')}</span></button>
              <div className="button-row stacked">
                <button className="primary-button" onClick={() => runAction(() => reviewerApi.approve(details.id))}><BadgeCheck size={18} /><span>{t('approve')}</span></button>
                <button className="danger-button" onClick={() => runAction(() => reviewerApi.reject(details.id))}><X size={18} /><span>{t('reject')}</span></button>
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewList({ items, onDetails, onClaim }: { items: AudioSubmissionResponse[]; onDetails: (id: number) => void; onClaim?: (id: number) => void }) {
  const { t } = useTranslation();
  if (!items.length) return <EmptyState label={t('noData')} />;
  return (
    <div className="submission-list">
      {items.map((item) => (
        <article key={item.id} className="compact-row interactive-row">
          <div>
            <strong>{t('submission')}</strong>
            <p>{t('audioTask')}</p>
            <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge>
          </div>
          <div className="button-row">
            <button className="secondary-button small-button" onClick={() => onDetails(item.id)}>{t('details')}</button>
            {onClaim && <button className="primary-button small-button" onClick={() => onClaim(item.id)}>{t('claim')}</button>}
          </div>
        </article>
      ))}
    </div>
  );
}

function WalletView() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [transactions, setTransactions] = useState<SliceResponse<WalletTransactionResponse>>(emptySlice());
  const [transactionPage, setTransactionPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadWallet = async () => {
    const walletData = await walletApi.me();
    setWallet(walletData);
  };

  const loadTransactions = async (page = transactionPage) => {
    const txData = await walletApi.transactions(page, 20);
    setTransactions(txData);
    setTransactionPage(txData.page ?? page);
  };

  const load = async (page = transactionPage) => {
    setLoading(true);
    try {
      await Promise.all([loadWallet(), loadTransactions(page)]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wallet-grid">
      <StatCard icon={<WalletCards size={22} />} label={t('balance')} value={loading && !wallet ? t('loading') : formatMoney(wallet?.balance)} />
      <section className="glass-card panel-section wide-panel">
        <div className="section-heading roomy">
          <div>
            <p className="eyebrow-soft">{t('history')}</p>
            <h2>{t('transactions')}</h2>
          </div>
        </div>
        {!transactions.content.length && <EmptyState label={t('noData')} />}
        <div className="transaction-list">
          {transactions.content.map((transaction) => (
            <article key={transaction.id} className="compact-row">
              <div>
                <strong>{transaction.type}</strong>
                <p>{transaction.description ?? transaction.sourceReferenceId ?? '—'}</p>
              </div>
              <div className="row-meta">
                <strong>{formatMoney(transaction.amount)}</strong>
                <span>{formatDate(transaction.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
        <Pagination page={transactionPage} last={transactions.last} onPrevious={() => loadTransactions(Math.max(0, transactionPage - 1))} onNext={() => loadTransactions(transactionPage + 1)} />
      </section>
    </div>
  );
}

function AdminView({ setNotice }: { setNotice: (notice: Notice) => void }) {
  const { t } = useTranslation();
  const [generatePayload, setGeneratePayload] = useState<GenerateWikipediaTextsRequest>({
    languageCode: 'en',
    requestedCount: 5,
    minWords: 25,
    maxWords: 100,
    baseRatePerWord: '0.01',
    activateImmediately: true,
    wikipediaFetchLimit: 20,
    introOnly: true,
    minDifficultyScore: 0,
    maxDifficultyScor: 100
  });
  const [batches, setBatches] = useState<SliceResponse<AdminAudioTextBatchListItemResponse>>(emptySlice());
  const [texts, setTexts] = useState<SliceResponse<AdminAudioTextListItemResponse>>(emptySlice());
  const [statusFilter, setStatusFilter] = useState<AudioTextStatus | ''>('');
  const [textPage, setTextPage] = useState(0);
  const [batchPage, setBatchPage] = useState(0);

  const loadTexts = async (page = textPage) => {
    const textData = await adminTextApi.texts(statusFilter, page, 20);
    setTexts(textData);
    setTextPage(textData.page ?? page);
  };

  const loadBatches = async (page = batchPage) => {
    const batchData = await adminTextApi.batches(page, 20);
    setBatches(batchData);
    setBatchPage(batchData.page ?? page);
  };

  const loadAdminData = async (nextTextPage = textPage, nextBatchPage = batchPage) => {
    await Promise.all([loadBatches(nextBatchPage), loadTexts(nextTextPage)]);
  };

  const run = async (callback: () => Promise<unknown>) => {
    try {
      await callback();
      setNotice({ kind: 'success', message: t('success') });
      loadAdminData();
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    }
  };

  useEffect(() => {
    setTextPage(0);
    loadTexts(0).catch((error) => setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    loadBatches(0).catch((error) => setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-layout">
      <section className="glass-card panel-section wide-panel">
        <div className="section-heading"><h2>{t('generateTexts')}</h2></div>
        <div className="admin-form-grid">
          <Field label={t('languageCode')}><input value={generatePayload.languageCode} onChange={(event) => setGeneratePayload({ ...generatePayload, languageCode: event.target.value })} /></Field>
          <Field label={t('requestedCount')}><input type="number" value={generatePayload.requestedCount} onChange={(event) => setGeneratePayload({ ...generatePayload, requestedCount: Number(event.target.value) })} /></Field>
          <Field label={t('minWords')}><input type="number" value={generatePayload.minWords} onChange={(event) => setGeneratePayload({ ...generatePayload, minWords: Number(event.target.value) })} /></Field>
          <Field label={t('maxWords')}><input type="number" value={generatePayload.maxWords} onChange={(event) => setGeneratePayload({ ...generatePayload, maxWords: Number(event.target.value) })} /></Field>
          <Field label={t('baseRatePerWord')}><input value={String(generatePayload.baseRatePerWord)} onChange={(event) => setGeneratePayload({ ...generatePayload, baseRatePerWord: event.target.value })} /></Field>
          <Field label={t('wikipediaFetchLimit')}><input type="number" value={generatePayload.wikipediaFetchLimit} onChange={(event) => setGeneratePayload({ ...generatePayload, wikipediaFetchLimit: Number(event.target.value) })} /></Field>
        </div>
        <div className="toggle-row">
          <label><input type="checkbox" checked={generatePayload.activateImmediately} onChange={(event) => setGeneratePayload({ ...generatePayload, activateImmediately: event.target.checked })} /> {t('activateImmediately')}</label>
          <label><input type="checkbox" checked={generatePayload.introOnly} onChange={(event) => setGeneratePayload({ ...generatePayload, introOnly: event.target.checked })} /> {t('introOnly')}</label>
        </div>
        <button className="primary-button" onClick={() => run(() => adminTextApi.generate(generatePayload))}><WandSparkles size={18} /><span>{t('generate')}</span></button>
      </section>

      <section className="glass-card panel-section wide-panel">
        <div className="section-heading roomy">
          <div><p className="eyebrow-soft">{t('admin')}</p><h2>{t('manageTexts')}</h2></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AudioTextStatus | '')}>
            <option value="">{t('all')}</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <div className="admin-table-list">
          {texts.content.map((text) => (
            <article key={text.id} className="compact-row">
              <div>
                <strong>{text.sourceTitle}</strong>
                <p>{text.languageCode} · {text.wordCount} {t('words')}</p>
                <StatusBadge tone={toneForStatus(text.status)}>{text.status}</StatusBadge>
              </div>
              <div className="button-row wrap">
                <button className="secondary-button small-button" onClick={() => run(() => adminTextApi.activate(text.id))}>{t('activate')}</button>
                <button className="secondary-button small-button" onClick={() => run(() => adminTextApi.disable(text.id))}>{t('disable')}</button>
                <button className="secondary-button small-button" onClick={() => run(() => adminTextApi.archive(text.id))}>{t('archive')}</button>
              </div>
            </article>
          ))}
          {!texts.content.length && <EmptyState label={t('noData')} />}
        </div>
        <Pagination page={textPage} last={texts.last} onPrevious={() => loadTexts(Math.max(0, textPage - 1))} onNext={() => loadTexts(textPage + 1)} />
      </section>

      <section className="glass-card panel-section wide-panel">
        <div className="section-heading"><h2>{t('textBatches')}</h2></div>
        <div className="admin-table-list">
          {batches.content.map((batch) => (
            <article key={batch.id} className="compact-row">
              <div>
                <strong>{t('textBatch')}</strong>
                <p>{batch.languageCode} · {batch.savedCount}/{batch.requestedCount} · {t('skippedCount')}: {batch.skippedCount}</p>
              </div>
              <StatusBadge tone={toneForStatus(batch.status)}>{batch.status}</StatusBadge>
            </article>
          ))}
          {!batches.content.length && <EmptyState label={t('noData')} />}
        </div>
        <Pagination page={batchPage} last={batches.last} onPrevious={() => loadBatches(Math.max(0, batchPage - 1))} onNext={() => loadBatches(batchPage + 1)} />
      </section>
    </div>
  );
}

function SettingsView({ setNotice }: { setNotice: (notice: Notice) => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '' });

  const run = async (callback: () => Promise<string>) => {
    try {
      await callback();
      setNotice({ kind: 'success', message: t('success') });
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    }
  };

  return (
    <div className="settings-grid">
      <section className="glass-card panel-section settings-card">
        <h2>{t('changeEmail')}</h2>
        <div className="form-stack">
          <Field label={t('email')}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <button className="primary-button" onClick={() => run(() => authApi.changeEmail(email))}>{t('save')}</button>
        </div>
      </section>
      <section className="glass-card panel-section settings-card">
        <h2>{t('changeUsername')}</h2>
        <div className="form-stack">
          <Field label={t('username')}><input value={username} onChange={(event) => setUsername(event.target.value)} /></Field>
          <button className="primary-button" onClick={() => run(() => authApi.changeUsername(username))}>{t('save')}</button>
        </div>
      </section>
      <section className="glass-card panel-section settings-card">
        <h2>{t('changePassword')}</h2>
        <div className="form-stack">
          <Field label={t('oldPassword')}><input type="password" value={passwords.oldPassword} onChange={(event) => setPasswords({ ...passwords, oldPassword: event.target.value })} /></Field>
          <Field label={t('newPassword')}><input type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></Field>
          <button className="primary-button" onClick={() => run(() => authApi.changePassword(passwords.oldPassword, passwords.newPassword))}>{t('save')}</button>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="empty-state">
      <ListFilter size={20} />
      <span>{label}</span>
    </div>
  );
}

function Pagination({ page, last, onPrevious, onNext }: { page: number; last: boolean; onPrevious: () => void; onNext: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="pagination-row">
      <button className="secondary-button small-button" disabled={page <= 0} onClick={onPrevious}><ChevronLeft size={16} /><span>{t('previous')}</span></button>
      <span>{t('page')} {page + 1}</span>
      <button className="secondary-button small-button" disabled={last} onClick={onNext}><span>{t('next')}</span><ChevronRight size={16} /></button>
    </div>
  );
}
