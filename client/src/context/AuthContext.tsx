import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import client from '../api/client';

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const res = await client.post('/auth/login', { email, password });
        const { token: t, user: u } = res.data;
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
        setToken(t);
        setUser(u);
    };

    const signup = async (email: string, password: string, name: string) => {
        const res = await client.post('/auth/signup', { email, password, name });
        const { token: t, user: u } = res.data;
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
        setToken(t);
        setUser(u);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, signup, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
