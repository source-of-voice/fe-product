import { AudioLines, Mic2, WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InfoPill, StatCard } from '../components/ui';
import type { NavigateTo } from '../types/ui';

export function DashboardPage({ setView }: { setView: NavigateTo }) {
  const { t } = useTranslation();
  return (
    <div className="dashboard-grid">
      <StatCard icon={<AudioLines size={22} />} label={t('tasks')} value={t('browseAndRecord')} action={<button className="secondary-button small-button" onClick={() => setView('audio')}>{t('open')}</button>} />
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
