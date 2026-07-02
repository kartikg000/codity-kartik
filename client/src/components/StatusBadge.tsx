const STATUS_COLORS: Record<string, string> = {
    QUEUED: '#3b82f6',
    SCHEDULED: '#8b5cf6',
    CLAIMED: '#f59e0b',
    RUNNING: '#06b6d4',
    COMPLETED: '#10b981',
    FAILED: '#ef4444',
    DEAD_LETTER: '#dc2626',
    ACTIVE: '#10b981',
    PAUSED: '#f59e0b',
    ONLINE: '#10b981',
    OFFLINE: '#6b7280',
    DRAINING: '#f59e0b',
};

export default function StatusBadge({ status }: { status: string }) {
    const color = STATUS_COLORS[status] || '#6b7280';
    return (
        <span
            className="status-badge"
            style={{
                backgroundColor: `${color}20`,
                color: color,
                borderColor: `${color}40`,
            }}
        >
            {status}
        </span>
    );
}
