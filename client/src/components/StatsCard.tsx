import type { ReactNode } from 'react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: ReactNode;
    color?: string;
}

export default function StatsCard({ title, value, subtitle, icon, color = '#6366f1' }: StatsCardProps) {
    return (
        <div className="stats-card" style={{ borderTopColor: color }}>
            <div className="stats-card-header">
                <span className="stats-card-title">{title}</span>
                {icon && <span className="stats-card-icon">{icon}</span>}
            </div>
            <div className="stats-card-value">{value}</div>
            {subtitle && <div className="stats-card-subtitle">{subtitle}</div>}
        </div>
    );
}
