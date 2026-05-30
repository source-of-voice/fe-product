import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field-block">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="info-pill">
      {icon}
      <span>{label}</span>
    </span>
  );
}

export function StatCard({ icon, label, value, action }: { icon: ReactNode; label: string; value: string; action?: ReactNode }) {
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

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="empty-state">
      <ListFilter size={20} />
      <span>{label}</span>
    </div>
  );
}

export function Pagination({ page, last, onPrevious, onNext }: { page: number; last: boolean; onPrevious: () => void; onNext: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="pagination-row">
      <button className="secondary-button small-button" disabled={page <= 0} onClick={onPrevious}><ChevronLeft size={16} /><span>{t('previous')}</span></button>
      <span>{t('page')} {page + 1}</span>
      <button className="secondary-button small-button" disabled={last} onClick={onNext}><span>{t('next')}</span><ChevronRight size={16} /></button>
    </div>
  );
}
