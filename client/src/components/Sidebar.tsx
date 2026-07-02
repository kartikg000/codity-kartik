import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const links = [
        { to: '/', label: 'Dashboard', icon: '📊' },
        { to: '/projects', label: 'Projects', icon: '📁' },
        { to: '/queues', label: 'Queues', icon: '📋' },
        { to: '/jobs', label: 'Jobs', icon: '⚡' },
        { to: '/workers', label: 'Workers', icon: '🔧' },
        { to: '/dlq', label: 'Dead Letter Queue', icon: '💀' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="sidebar-logo">⚙️</span>
                <span className="sidebar-title">Codity</span>
            </div>

            <nav className="sidebar-nav">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                        }
                    >
                        <span className="sidebar-link-icon">{link.icon}</span>
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <span className="sidebar-user-avatar">
                        {user?.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                    <span className="sidebar-user-name">{user?.name}</span>
                </div>
                <button className="sidebar-logout" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </aside>
    );
}
