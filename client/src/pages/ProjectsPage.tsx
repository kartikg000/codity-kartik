import { useEffect, useState } from 'react';
import client from '../api/client';

interface Project {
    id: string;
    name: string;
    organizationId: string;
    createdAt: string;
    queues: { id: string; name: string; status: string }[];
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        client
            .get('/projects')
            .then((res) => setProjects(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-loading">Loading projects...</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Projects</h1>
                <p className="page-subtitle">Your projects and their queues</p>
            </div>

            {projects.length === 0 ? (
                <div className="empty-state">No projects found.</div>
            ) : (
                <div className="card-grid">
                    {projects.map((p) => (
                        <div key={p.id} className="project-card">
                            <h3>{p.name}</h3>
                            <p className="text-muted">
                                {p.queues.length} queue{p.queues.length !== 1 ? 's' : ''}
                            </p>
                            <div className="project-queues">
                                {p.queues.map((q) => (
                                    <span key={q.id} className={`queue-tag queue-tag-${q.status.toLowerCase()}`}>
                                        {q.name}
                                    </span>
                                ))}
                            </div>
                            <p className="text-xs text-muted">
                                Created {new Date(p.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
