import type { ReactNode } from 'react';
import './index.css';

interface StatCardProps {
  icon: ReactNode;
  iconBgColor: string;
  label: string;
  value: number | string;
}

export function StatCard({ icon, iconBgColor, label, value }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <div
          className="stat-card__icon-bubble"
          style={{ backgroundColor: iconBgColor }}
        >
          {icon}
        </div>
      </div>
      <span className="stat-card__value">{value}</span>
    </div>
  );
}
