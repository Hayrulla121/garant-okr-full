import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ParticleBackground from '../components/ParticleBackground';
import './LoginPage.css';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <ParticleBackground />
            <div className="login-card">
                <img src="/logo_garantbank.png" alt="Garant Bank" className="login-logo" />
                <h1>OKR Tracker</h1>
                <h2>Login</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="demo-credentials">
                    <h3>Demo Credentials</h3>
                    <p><strong>Admin:</strong> admin / admin123</p>
                    <p><strong>Director:</strong> director / director123</p>
                    <p><strong>HR:</strong> hr / hr123</p>
                    <p><strong>Business Block:</strong> business / business123</p>
                    <p><strong>PMO Leader:</strong> pmo_leader / leader123</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
