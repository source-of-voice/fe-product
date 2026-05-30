import type { ReactNode } from 'react';

interface GlassCardProps {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function GlassCard({ title, eyebrow, action, children, className = '' }: GlassCardProps) {
  return (
    <section className={`glass-card ${className}`}>
      {(title || eyebrow || action) && (
        <header className="card-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
