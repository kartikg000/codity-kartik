import { useEffect, useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

interface Worker {
    id: string;
    hostname: string;
    status: string;
    lastHeartbeat: string;
    createdAt: string;
    activeJobs: number;
    totalExecutions: number;
    latestMetrics: any;
}

export default function WorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWorkers = () => {
        client
            .get('/metrics/workers')
            .then((res) => setWorkers(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchWorkers();
        const interval = setInterval(fetchWorkers, 5000);
        return () => clearInterval(interval);
    }, []);

    const timeAgo = (dateStr: string) => {
        const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    if (loading) return <div className="page-loading">Loading workers...</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Workers</h1>
                <p className="page-subtitle">
                    {workers.filter((w) => w.status === 'ONLINE').length} online of {workers.length} total
                </p>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Hostname</th>
                            <th>Status</th>
                            <th>Active Jobs</th>
                            <th>Total Executions</th>
                            <th>Last Heartbeat</th>
                            <th>Started</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workers.map((w) => (
                            <tr key={w.id}>
                                <td className="font-mono text-xs">{w.id.slice(0, 8)}...</td>
                                <td className="font-medium">{w.hostname}</td>
                                <td><StatusBadge status={w.status} /></td>
                                <td>{w.activeJobs}</td>
                                <td>{w.totalExecutions}</td>
                                <td className="text-xs">{timeAgo(w.lastHeartbeat)}</td>
                                <td className="text-xs">{new Date(w.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
