import { useEffect, useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

interface QueueStat {
    id: string;
    name: string;
    status: string;
    project: { id: string; name: string };
    concurrencyLimit: number;
    priority: number;
    depth: number;
    running: number;
    completed: number;
    failed: number;
    totalJobs: number;
}

export default function QueuesPage() {
    const [queues, setQueues] = useState<QueueStat[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQueues = () => {
        client
            .get('/metrics/queues')
            .then((res) => setQueues(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchQueues();
        const interval = setInterval(fetchQueues, 5000);
        return () => clearInterval(interval);
    }, []);

    const toggleQueue = async (id: string, currentStatus: string) => {
        const action = currentStatus === 'ACTIVE' ? 'pause' : 'resume';
        try {
            await client.post(`/queues/${id}/${action}`);
            fetchQueues();
        } catch (err) {
            console.error(`Failed to ${action} queue:`, err);
        }
    };

    if (loading) return <div className="page-loading">Loading queues...</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Queues</h1>
                <p className="page-subtitle">Queue health and configuration</p>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Project</th>
                            <th>Status</th>
                            <th>Depth</th>
                            <th>Running</th>
                            <th>Completed</th>
                            <th>Failed</th>
                            <th>Concurrency</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {queues.map((q) => (
                            <tr key={q.id}>
                                <td className="font-medium">{q.name}</td>
                                <td className="text-muted">{q.project.name}</td>
                                <td><StatusBadge status={q.status} /></td>
                                <td>{q.depth}</td>
                                <td>{q.running}</td>
                                <td className="text-success">{q.completed}</td>
                                <td className="text-danger">{q.failed}</td>
                                <td>{q.concurrencyLimit}</td>
                                <td>
                                    <button
                                        className={`btn-sm ${q.status === 'ACTIVE' ? 'btn-warn' : 'btn-success'}`}
                                        onClick={() => toggleQueue(q.id, q.status)}
                                    >
                                        {q.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
