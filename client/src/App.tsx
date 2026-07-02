import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import QueuesPage from './pages/QueuesPage';
import JobsPage from './pages/JobsPage';
import WorkersPage from './pages/WorkersPage';
import DLQPage from './pages/DLQPage';
import './App.css';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route element={<Layout />}>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/projects" element={<ProjectsPage />} />
                        <Route path="/queues" element={<QueuesPage />} />
                        <Route path="/jobs" element={<JobsPage />} />
                        <Route path="/workers" element={<WorkersPage />} />
                        <Route path="/dlq" element={<DLQPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
