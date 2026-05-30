import { useEffect, useState } from 'react';
import { WandSparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminTextApi } from '../api/sourceOfVoiceApi';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, Field, Pagination } from '../components/ui';
import type { AdminAudioTextBatchListItemResponse, AdminAudioTextListItemResponse, AudioTextStatus, GenerateWikipediaTextsRequest, SliceResponse } from '../types/domain';
import type { Notice } from '../types/ui';
import { emptySlice } from '../utils/paging';
import { formatStatusLabel, toneForStatus } from '../utils/format';
import { getUserFriendlyErrorMessage } from '../utils/errors';

export function AdminTextPage({ setNotice }: { setNotice: (notice: Notice) => void }) {
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
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
    }
  };

  useEffect(() => {
    setTextPage(0);
    loadTexts(0).catch((error) => setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    loadBatches(0).catch((error) => setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-layout admin-text-layout">
      <section className="glass-card panel-section wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow-soft">{t('adminTexts')}</p>
            <h2>{t('generateTexts')}</h2>
            <p className="section-help">{t('generateTextsHelp')}</p>
          </div>
        </div>
        <div className="admin-form-grid">
          <Field label={t('languageCode')}><input value={generatePayload.languageCode} onChange={(event) => setGeneratePayload({ ...generatePayload, languageCode: event.target.value })} /></Field>
          <Field label={t('requestedCount')} hint={t('requestedCountHint')}><input type="number" value={generatePayload.requestedCount} onChange={(event) => setGeneratePayload({ ...generatePayload, requestedCount: Number(event.target.value) })} /></Field>
          <Field label={t('minWords')}><input type="number" value={generatePayload.minWords} onChange={(event) => setGeneratePayload({ ...generatePayload, minWords: Number(event.target.value) })} /></Field>
          <Field label={t('maxWords')}><input type="number" value={generatePayload.maxWords} onChange={(event) => setGeneratePayload({ ...generatePayload, maxWords: Number(event.target.value) })} /></Field>
          <Field label={t('baseRatePerWord')}><input value={String(generatePayload.baseRatePerWord)} onChange={(event) => setGeneratePayload({ ...generatePayload, baseRatePerWord: event.target.value })} /></Field>
          <Field label={t('wikipediaFetchLimit')} hint={t('wikipediaFetchLimitHint')}><input type="number" value={generatePayload.wikipediaFetchLimit} onChange={(event) => setGeneratePayload({ ...generatePayload, wikipediaFetchLimit: Number(event.target.value) })} /></Field>
        </div>
        <div className="toggle-row">
          <label><input type="checkbox" checked={generatePayload.activateImmediately} onChange={(event) => setGeneratePayload({ ...generatePayload, activateImmediately: event.target.checked })} /> {t('activateImmediately')}</label>
          <label><input type="checkbox" checked={generatePayload.introOnly} onChange={(event) => setGeneratePayload({ ...generatePayload, introOnly: event.target.checked })} /> {t('introOnly')}</label>
        </div>
        <button className="primary-button" onClick={() => run(() => adminTextApi.generate(generatePayload))}><WandSparkles size={18} /><span>{t('generate')}</span></button>
      </section>

      <section className="glass-card panel-section wide-panel">
        <div className="section-heading roomy">
          <div><p className="eyebrow-soft">{t('admin')}</p><h2>{t('manageTexts')}</h2><p className="section-help">{t('manageTextsHelp')}</p></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AudioTextStatus | '')}>
            <option value="">{t('all')}</option>
            <option value="GENERATED">GENERATED</option>
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
                <StatusBadge tone={toneForStatus(text.status)}>{formatStatusLabel(text.status, t)}</StatusBadge>
              </div>
              <div className="button-row wrap">
                <button className="secondary-button small-button" onClick={() => run(() => text.status === 'ACTIVE' ? adminTextApi.disable(text.id) : adminTextApi.activate(text.id))}>
                  {text.status === 'ACTIVE' ? t('disable') : t('activate')}
                </button>
                <button className="secondary-button small-button" disabled={text.status === 'ARCHIVED'} onClick={() => run(() => adminTextApi.archive(text.id))}>{t('archive')}</button>
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
                <p>{t('language')}: {batch.languageCode} · {t('savedCount')}: {batch.savedCount}/{batch.requestedCount} · {t('skippedCount')}: {batch.skippedCount}</p>
              </div>
              <StatusBadge tone={toneForStatus(batch.status)}>{formatStatusLabel(batch.status, t)}</StatusBadge>
            </article>
          ))}
          {!batches.content.length && <EmptyState label={t('noData')} />}
        </div>
        <Pagination page={batchPage} last={batches.last} onPrevious={() => loadBatches(Math.max(0, batchPage - 1))} onNext={() => loadBatches(batchPage + 1)} />
      </section>
    </div>
  );
}
