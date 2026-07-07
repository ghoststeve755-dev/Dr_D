'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Lock, Sprout } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function checkExistingUsers() {
      try {
        const { data, error } = await supabase.rpc('get_user_count');
        if (data && data > 0) setRegistrationClosed(true);
      } catch {}
      finally { setCheckingUsers(false); }
    }
    checkExistingUsers();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username || !password) { setErrorMsg('Please fill in all required fields.'); return; }
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const email = `${username.trim().toLowerCase()}@doctor-d.com`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() || username, timezone: 'Asia/Kolkata' } }
      });
      if (error) setErrorMsg(error.message || JSON.stringify(error));
      else { router.push('/'); router.refresh(); }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingUsers) {
    return (
      <div className="auth-root">
        <div className="auth-bg" />
        <div className="auth-loading">
          <div className="spinner" />
        </div>
        <style jsx global>{`${sharedStyles}`}</style>
      </div>
    );
  }

  if (registrationClosed) {
    return (
      <div className="auth-root">
        <div className="auth-bg" />
        <div className="auth-wrapper animate-scale-in">
          <div className="auth-logomark">
            <div className="logomark-d"><Sprout size={28} strokeWidth={2.5} /></div>
          </div>
          <div className="auth-form" style={{ textAlign: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="closed-icon">
              <Lock size={28} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                Registration Closed
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This is a single-user system. An account has already been set up on this instance.
              </p>
            </div>
            <Link href="/login" className="auth-submit" style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}>
              Go to Sign In
            </Link>
          </div>
        </div>
        <style jsx global>{`${sharedStyles}`}</style>
      </div>
    );
  }

  return (
    <div className="auth-root">
      <div className="auth-bg" />

      <div className="auth-wrapper animate-scale-in">
        <div className="auth-logomark">
          <div className="logomark-d"><Sprout size={28} strokeWidth={2.5} /></div>
        </div>

        <div className="auth-headline">
          <h1>Create Your Account</h1>
          <p>Set up your personal Doctor D dashboard.</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          {errorMsg && (
            <div className="auth-error animate-fade-in">{errorMsg}</div>
          )}

          <div className="field-group">
            <label htmlFor="name">Display Name <span className="optional">optional</span></label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Muthu"
              value={name}
              onChange={e => setName(e.target.value)}
              className="auth-input"
            />
          </div>

          <div className="field-group">
            <label htmlFor="username">Username <span className="required">*</span></label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="Choose a username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="auth-input"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">Password <span className="required">*</span></label>
            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="auth-input"
                required
              />
              <button type="button" className="eye-btn" onClick={() => setShowPassword(p => !p)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? <span className="btn-spinner" /> : 'Create Account'}
          </button>
        </form>

        <div className="auth-setup-hint">
          <span>Already have an account?</span>
          <Link href="/login" className="setup-link">Sign in →</Link>
        </div>
      </div>

      <style jsx global>{`${sharedStyles}`}</style>
    </div>
  );
}

const sharedStyles = `
  .auth-root {
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-base);
    padding: 24px;
    position: relative;
    overflow: hidden;
  }
  .auth-bg {
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 20% 20%, rgba(94, 92, 230, 0.06) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(10, 132, 255, 0.04) 0%, transparent 50%);
    pointer-events: none;
  }
  .auth-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px;
  }
  .auth-wrapper {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 380px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
  }
  .auth-logomark {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logomark-d {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    background: linear-gradient(145deg, #1c1c1e 0%, #2c2c2e 100%);
    border: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 800;
    color: var(--primary);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
    letter-spacing: -1px;
  }
  @media (prefers-color-scheme: light) {
    .logomark-d {
      background: linear-gradient(145deg, #f5f5f7 0%, #ffffff 100%);
      border-color: rgba(0,0,0,0.08);
      box-shadow: 0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06);
    }
  }
  .auth-headline {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .auth-headline h1 {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.5px;
  }
  .auth-headline p {
    font-size: 15px;
    color: var(--text-secondary);
  }
  .auth-form {
    width: 100%;
    background-color: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: var(--shadow-lg);
  }
  .auth-error {
    background-color: var(--danger-light);
    color: var(--danger);
    padding: 11px 14px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
  }
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .field-group label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .optional { font-weight: 400; color: var(--text-tertiary); font-size: 11px; }
  .required { color: var(--danger); }
  .auth-input {
    width: 100%;
    padding: 13px 14px;
    background-color: var(--bg-inset);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 15px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-appearance: none;
  }
  .auth-input:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px var(--primary-light);
  }
  .auth-input::placeholder { color: var(--text-tertiary); }
  .password-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .password-wrap .auth-input { padding-right: 44px; }
  .eye-btn {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    border-radius: 4px;
    transition: color 0.15s;
  }
  .eye-btn:hover { color: var(--text-secondary); }
  .auth-submit {
    width: 100%;
    padding: 14px;
    background-color: var(--primary);
    color: #ffffff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    letter-spacing: -0.01em;
  }
  .auth-submit:hover:not(:disabled) { opacity: 0.88; }
  .auth-submit:active:not(:disabled) { transform: scale(0.99); }
  .auth-submit:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  .closed-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--danger-light);
    color: var(--danger);
  }
  .auth-setup-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-tertiary);
  }
  .setup-link {
    color: var(--primary);
    font-weight: 600;
    transition: opacity 0.15s;
  }
  .setup-link:hover { opacity: 0.75; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
