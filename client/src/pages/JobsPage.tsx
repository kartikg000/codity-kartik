import { useEffect, useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

interface Job {
    id: string;
    type: string;
    status: string;
    priority: number;
    attempts: number;
    maxAttempts: number;
    runAt: string;
    createdAt: string;
    queue: { id: string; name: string };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const fetchJobs = (page = 1) => {
        const params: Record<string, string | number> = { page, limit: 20 };
        if (statusFilter) params.status = statusFilter;
        if (typeFilter) params.type = typeFilter;

        client
            .get('/jobs', { params })
            .then((res) => {
                setJobs(res.data.jobs);
                setPagination(res.data.pagination);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchJobs();
    }, [statusFilter, typeFilter]);

    const deleteJob = async (id: string) => {
        try {
            await client.delete(`/jobs/${id}`);
            fetchJobs(pagination.page);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete job');
        }
    };

    if (loading) return <div className="page-loading">Loading jobs...</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Jobs</h1>
                <p className="page-subtitle">
                    {pagination.total} total job{pagination.total !== 1 ? 's' : ''}
                </p>
            </div>

            <div className="filters">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Statuses</option>
                    <option value="QUEUED">Queued</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CLAIMED">Claimed</option>
                    <option value="RUNNING">Running</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                    <option value="DEAD_LETTER">Dead Letter</option>
                </select>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Types</option>
                    <option value="IMMEDIATE">Immediate</option>
                    <option value="DELAYED">Delayed</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="RECURRING">Recurring</option>
                    <option value="BATCH">Batch</option>
                </select>
                <button className="btn-sm btn-primary" onClick={() => fetchJobs(pagination.page)}>
                    Refresh
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Queue</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Attempts</th>
                            <th>Run At</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map((job) => (
                            <tr key={job.id}>
                                <td className="font-mono text-xs">{job.id.slice(0, 8)}...</td>
                                <td>{job.queue.name}</td>
                                <td><StatusBadge status={job.type} /></td>
                                <td><StatusBadge status={job.status} /></td>
                                <td>{job.priority}</td>
                                <td>{job.attempts}/{job.maxAttempts}</td>
                                <td className="text-xs">{new Date(job.runAt).toLocaleString()}</td>
                                <td className="text-xs">{new Date(job.createdAt).toLocaleString()}</td>
                                <td>
                                    <button
                                        className="btn-sm btn-danger"
                                        onClick={() => deleteJob(job.id)}
                                        disabled={job.status === 'RUNNING'}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination.totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="btn-sm"
                        disabled={pagination.page <= 1}
                        onClick={() => fetchJobs(pagination.page - 1)}
                    >
                        ← Prev
                    </button>
                    <span className="pagination-info">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                        className="btn-sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchJobs(pagination.page + 1)}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
