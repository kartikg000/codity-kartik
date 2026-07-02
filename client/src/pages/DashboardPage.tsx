import { useEffect, useState } from 'react';
import client from '../api/client';
import StatsCard from '../components/StatsCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Overview {
    jobs: {
        total: number;
        queued: number;
        running: number;
        completed: number;
        failed: number;
        deadLetter: number;
        successRate: number;
    };
    queues: { total: number; active: number; paused: number };
    workers: { total: number; online: number };
    dlq: { total: number };
}

interface ThroughputPoint {
    time: string;
    completed: number;
    failed: number;
    total: number;
}

export default function DashboardPage() {
    const [overview, setOverview] = useState<Overview | null>(null);
    const [throughput, setThroughput] = useState<ThroughputPoint[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [ovRes, tpRes] = await Promise.all([
                client.get('/metrics/overview'),
                client.get('/metrics/throughput'),
            ]);
            setOverview(ovRes.data);
            setThroughput(tpRes.data);
        } catch (err) {
            console.error('Failed to fetch metrics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="page-loading">Loading dashboard...</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p className="page-subtitle">System overview and metrics</p>
            </div>

            <div className="stats-grid">
                <StatsCard
                    title="Total Jobs"
                    value={overview?.jobs.total ?? 0}
                    subtitle={`${overview?.jobs.running ?? 0} running`}
                    color="#6366f1"
                />
                <StatsCard
                    title="Queued"
                    value={overview?.jobs.queued ?? 0}
                    subtitle="Waiting to execute"
                    color="#3b82f6"
                />
                <StatsCard
                    title="Completed"
                    value={overview?.jobs.completed ?? 0}
                    subtitle={`${overview?.jobs.successRate ?? 0}% success rate`}
                    color="#10b981"
                />
                <StatsCard
                    title="Failed"
                    value={overview?.jobs.failed ?? 0}
                    subtitle={`${overview?.dlq.total ?? 0} in DLQ`}
                    color="#ef4444"
                />
                <StatsCard
                    title="Active Queues"
                    value={`${overview?.queues.active ?? 0} / ${overview?.queues.total ?? 0}`}
                    subtitle={`${overview?.queues.paused ?? 0} paused`}
                    color="#f59e0b"
                />
                <StatsCard
                    title="Workers Online"
                    value={`${overview?.workers.online ?? 0} / ${overview?.workers.total ?? 0}`}
                    color="#06b6d4"
                />
            </div>

            <div className="chart-container">
                <h2>Throughput (Last 60 Minutes)</h2>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={throughput} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3f" />
                        <XAxis
                            dataKey="time"
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            interval={4}
                        />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e1e2e',
                                border: '1px solid #2d2d3f',
                                borderRadius: 8,
                                color: '#e2e8f0',
                            }}
                        />
                        <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                        <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
