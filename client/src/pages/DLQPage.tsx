import { useEffect, useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

interface DLQEntry {
    id: string;
    reason: string;
    movedAt: string;
    job: {
        id: string;
        type: string;
        status: string;
        attempts: number;
        maxAttempts: number;
        queue: { id: string; name: string };
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function DLQPage() {
    const [entries, setEntries] = useState<DLQEntry[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);

    const fetchDLQ = (page = 1) => {
        client
            .get('/dlq', { params: { page, limit: 20 } })
            .then((res) => {
                setEntries(res.data.entries);
                setPagination(res.data.pagination);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchDLQ();
    }, []);

    const retryJob = async (dlqId: string) => {
        try {
            await client.post(`/dlq/${dlqId}/retry`);
            fetchDLQ(pagination.page);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to retry job');
        }
    };

    if (loading) return <div className="page-loading">Loading DLQ...</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Dead Letter Queue</h1>
                <p className="page-subtitle">
                    {pagination.total} job{pagination.total !== 1 ? 's' : ''} in DLQ
                </p>
            </div>

            {entries.length === 0 ? (
                <div className="empty-state">No dead-lettered jobs. All systems healthy! 🎉</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Job ID</th>
                                <th>Queue</th>
                                <th>Type</th>
                                <th>Attempts</th>
                                <th>Reason</th>
                                <th>Moved At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e) => (
                                <tr key={e.id}>
                                    <td className="font-mono text-xs">{e.job.id.slice(0, 8)}...</td>
                                    <td>{e.job.queue.name}</td>
                                    <td><StatusBadge status={e.job.type} /></td>
                                    <td>{e.job.attempts}/{e.job.maxAttempts}</td>
                                    <td className="text-xs text-danger" title={e.reason}>
                                        {e.reason.length > 80 ? e.reason.slice(0, 80) + '...' : e.reason}
                                    </td>
                                    <td className="text-xs">{new Date(e.movedAt).toLocaleString()}</td>
                                    <td>
                                        <button className="btn-sm btn-primary" onClick={() => retryJob(e.id)}>
                                            Retry
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {pagination.totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="btn-sm"
                        disabled={pagination.page <= 1}
                        onClick={() => fetchDLQ(pagination.page - 1)}
                    >
                        ← Prev
                    </button>
                    <span className="pagination-info">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                        className="btn-sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchDLQ(pagination.page + 1)}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
