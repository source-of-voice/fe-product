import { useEffect, useState } from 'react';
import { BadgeCheck, Coins, Gauge, Headphones, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { reviewerApi } from '../api/sourceOfVoiceApi';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, InfoPill } from '../components/ui';
import type { AudioSubmissionResponse, ReviewerAudioSubmissionDetailsResponse, SliceResponse } from '../types/domain';
import type { Notice } from '../types/ui';
import { emptySlice } from '../utils/paging';
import { formatMoney, toneForStatus } from '../utils/format';
import { getUserFriendlyErrorMessage } from '../utils/errors';

export function ReviewerPage({ setNotice }: { setNotice: (notice: Notice) => void }) {
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
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
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
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
    }
  };

  const runAction = async (action: () => Promise<AudioSubmissionResponse>) => {
    try {
      await action();
      await load();
      setNotice({ kind: 'success', message: t('success') });
    } catch (error) {
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
    }
  };

  const playAudio = async (id: number) => {
    try {
      const blob = await reviewerApi.file(id);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (error) {
      setNotice({ kind: 'error', message: getUserFriendlyErrorMessage(error, t) });
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
        {loading && <p className="muted">{t('loading')}</p>}
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
