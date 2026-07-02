import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout() {
    const { token, isLoading } = useAuth();

    if (isLoading) {
        return <div className="loading-screen">Loading...</div>;
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
