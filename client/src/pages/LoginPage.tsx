import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const { login, signup } = useAuth();
    const navigate = useNavigate();
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isSignup) {
                await signup(email, password, name);
            } else {
                await login(email, password);
            }
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <span className="login-logo">⚙️</span>
                    <h1>Codity</h1>
                    <p>Distributed Job Scheduler</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {isSignup && (
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                required={isSignup}
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Log In'}
                    </button>
                </form>

                <div className="login-toggle">
                    {isSignup ? 'Already have an account?' : "Don't have an account?"}
                    <button
                        type="button"
                        className="btn-link"
                        onClick={() => setIsSignup(!isSignup)}
                    >
                        {isSignup ? 'Log In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
}
