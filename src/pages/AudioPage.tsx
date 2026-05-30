import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleStop, Loader2, Mic2, Search, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { audioApi, textApi } from '../api/sourceOfVoiceApi';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, Pagination } from '../components/ui';
import type { AudioSubmissionResponse, SliceResponse, UserAudioTextDetailsResponse, UserAudioTextListItemResponse } from '../types/domain';
import type { Notice } from '../types/ui';
import { emptySlice } from '../utils/paging';
import { fileSize, formatDuration, formatMoney, formatStatusLabel, toneForStatus } from '../utils/format';
import { AUDIO_ACCEPT, downloadRecordedFile, extensionForAudioType, isAllowedAudioFile, normalizeAudioType, pickRecordingMimeType } from '../utils/audio';
import { getUserFriendlyErrorMessage } from '../utils/errors';

type TaskSort = 'default' | 'priceDesc' | 'difficultyAsc' | 'difficultyDesc' | 'wordsAsc' | 'wordsDesc';

export function AudioPage({ language, setNotice }: { language: string; setNotice: (notice: Notice) => void }) {
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
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
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
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
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
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
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
            {loading && <p className="muted">{t('loading')}</p>}
            {visibleTasks.length === 0 && !loading && <EmptyState label={t('noData')} />}
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
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
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
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
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
            <strong>{t('recordingSubmission')}</strong>
            <p>{t('audioTask')}</p>
          </div>
          <div className="row-meta">
            <StatusBadge tone={toneForStatus(item.status)}>{formatStatusLabel(item.status, t)}</StatusBadge>
            <span>{formatMoney(item.payoutAmount)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
