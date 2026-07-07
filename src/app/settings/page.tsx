// src/app/settings/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, User, Bell, Shield, Database, CheckCircle2, CheckSquare } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Profile settings
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Password deletion verification state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Notification settings
  const [dailyReminder, setDailyReminder] = useState(true);
  const [dailyTime, setDailyTime] = useState('19:00:00');
  const [weeklyReminder, setWeeklyReminder] = useState(true);
  const [monthlyReminder, setMonthlyReminder] = useState(true);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [systemPermission, setSystemPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setSystemPermission(Notification.permission);
    } else {
      setSystemPermission('unsupported');
    }
  }, []);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile and notification settings in parallel
        const [profileResult, notifResult] = await Promise.all([
          supabase.from('users').select('*').eq('id', user.id).single(),
          supabase.from('notification_settings').select('*').eq('user_id', user.id).maybeSingle()
        ]);
        
        const profile = profileResult.data;
        if (profile) {
          setName(profile.name || '');
          setTimezone(profile.timezone || 'Asia/Kolkata');
        }

        const notif = notifResult.data;
        if (notif) {
          setDailyReminder(notif.daily_reminder);
          setDailyTime(notif.daily_time || '19:00:00');
          setWeeklyReminder(notif.weekly_reminder);
          setMonthlyReminder(notif.monthly_reminder);
          setIsPushSubscribed(notif.push_endpoint !== null);
        }

      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({ name, timezone })
        .eq('id', user.id);

      if (error) throw error;
      setSuccessMsg('Profile updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    }
  };

  const handleUpdateNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const formattedTime = dailyTime.length === 5 ? `${dailyTime}:00` : dailyTime;

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          daily_reminder: dailyReminder,
          daily_time: formattedTime,
          weekly_reminder: weeklyReminder,
          monthly_reminder: monthlyReminder,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      setSuccessMsg('Notification preferences updated!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update notification settings');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      setSuccessMsg('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const requestSystemNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setErrorMsg('This browser does not support system notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    setSystemPermission(permission);
    if (permission === 'granted') {
      setSuccessMsg('System notifications enabled!');
      // Show a test notification
      new Notification('Doctor D', {
        body: 'Notifications are working! We will remind you when it is time.',
        icon: '/icon-192.png'
      });
    } else {
      setErrorMsg('Notification permission denied.');
    }
  };

  const handleClearAllData = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    setDeleteError(null);
    setDeletePassword('');
    setShowDeleteModal(true);
  };

  const handlePasswordConfirmedClear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error('Not authenticated');

      // Verify the password by attempting to sign in with it
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });

      if (verifyError) {
        throw new Error('Incorrect password. Access denied.');
      }

      // Perform deletions in database
      const { error: logsError } = await supabase.from('habit_logs').delete().eq('user_id', user.id);
      if (logsError) throw logsError;

      const { error: journalError } = await supabase.from('daily_journals').delete().eq('user_id', user.id);
      if (journalError) throw journalError;

      const { error: reviewError } = await supabase.from('weekly_reviews').delete().eq('user_id', user.id);
      if (reviewError) throw reviewError;

      const { error: reportError } = await supabase.from('monthly_reports').delete().eq('user_id', user.id);
      if (reportError) throw reportError;

      setSuccessMsg('All habit logs and journal data cleared successfully.');
      setShowDeleteModal(false);
      setConfirmPassword('');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to clear data');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading Preferences...</p>
        <style jsx>{`
          .settings-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px;
            color: var(--text-secondary);
            gap: 12px;
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--border);
            border-top: 3px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="settings-page-container animate-fade-in">
      <div className="page-header">
        <h3>System Settings</h3>
        <p>Manage your profile, time zones, password, notifications, and dashboard data.</p>
      </div>

      {successMsg && (
        <div className="success-banner animate-scale-in">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="error-banner animate-scale-in">
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Profile Settings */}
        <form onSubmit={handleUpdateProfile} className="settings-card card-glass">
          <div className="card-title">
            <User size={18} />
            <h4>Profile Customization</h4>
          </div>
          <div className="form-group">
            <label htmlFor="display-name">Display Name</label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="timezone-select">Default Timezone</label>
            <select
              id="timezone-select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Save Profile</button>
        </form>

        {/* Notification Settings */}
        <form onSubmit={handleUpdateNotifications} className="settings-card card-glass">
          <div className="card-title">
            <Bell size={18} />
            <h4>Notifications & Reminders</h4>
          </div>

          <div className="system-permission-box">
            {systemPermission === 'granted' ? (
              <div className="permission-status success">
                <CheckSquare size={16} /> System Notifications Enabled
              </div>
            ) : systemPermission === 'unsupported' ? (
              <div className="permission-status error">
                Browser does not support notifications.
              </div>
            ) : (
              <button 
                type="button" 
                className="btn-outline permission-btn"
                onClick={requestSystemNotificationPermission}
              >
                Enable System Notifications
              </button>
            )}
            <p className="permission-hint">
              Allows the app to show local reminders (e.g. at your Daily Reminder Time) while the app is open in the background.
            </p>
          </div>

          <div className="toggle-row">
            <div className="toggle-info">
              <h5>Daily Journal Reminder</h5>
              <p className="inline-time-desc">
                Receive a reminder at 
                <input 
                  type="time" 
                  value={dailyTime} 
                  onChange={(e) => setDailyTime(e.target.value)}
                  className="inline-time-input"
                  disabled={!dailyReminder}
                  required
                />
                to fill out your daily habits.
              </p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={dailyReminder} 
                onChange={(e) => setDailyReminder(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div className="toggle-info">
              <h5>Weekly Review Prompt</h5>
              <p>Send reminder notifications on Sundays if Weekly Review is pending.</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={weeklyReminder} 
                onChange={(e) => setWeeklyReminder(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div className="toggle-info">
              <h5>Monthly Report Prompt</h5>
              <p>Send reminders near month-end to generate your monthly dashboard reports.</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={monthlyReminder} 
                onChange={(e) => setMonthlyReminder(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <button type="submit" className="btn-primary">Save Preferences</button>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="settings-card card-glass">
          <div className="card-title">
            <Shield size={18} />
            <h4>Security & Passwords</h4>
          </div>
          <div className="form-group">
            <label htmlFor="new-pw">New Password</label>
            <input
              id="new-pw"
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-pw">Confirm Password</label>
            <input
              id="confirm-pw"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={pwLoading} className="btn-primary">
            {pwLoading ? 'Updating...' : 'Change Password'}
          </button>
        </form>

        {/* Data Management */}
        <div className="settings-card card-glass danger-zone-card">
          <div className="card-title danger">
            <Database size={18} />
            <h4>Danger Zone (Data Management)</h4>
          </div>
          <p className="danger-text">
            Clearing your logs will permanently wipe out all journal history. This operation is irreversible.
          </p>
          <button onClick={handleClearAllData} className="btn-danger">
            Clear All Habit History
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}></div>
          <div className="modal-content animate-scale-in">
            <form onSubmit={handlePasswordConfirmedClear} className="password-confirm-form">
              <h3>Confirm History Deletion</h3>
              <p style={{ color: 'var(--danger)', fontWeight: 600 }}>
                🚨 WARNING: This will permanently delete ALL daily logs, weekly reviews, and monthly reports. You cannot undo this.
              </p>
              
              {deleteError && <div className="error-banner" style={{ margin: '0 0 10px 0' }}>{deleteError}</div>}
              
              <div className="form-group">
                <label htmlFor="confirm-delete-password">Enter your password to verify identity</label>
                <input
                  id="confirm-delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your account password"
                  required
                  autoFocus
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteError(null);
                  }} 
                  className="btn-secondary"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-danger-confirm"
                  disabled={deleteLoading || !deletePassword}
                >
                  {deleteLoading ? 'Verifying & Deleting...' : 'Permanently Delete All'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .settings-page-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header h3 {
          font-size: 24px;
          font-weight: 800;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
        }

        .page-header p {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .success-banner {
          background-color: var(--success-light);
          color: var(--success);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(16, 185, 129, 0.1);
        }

        .error-banner {
          background-color: var(--danger-light);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          border: 1px solid rgba(239, 68, 68, 0.1);
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .settings-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--primary);
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .card-title.danger {
          color: var(--danger);
        }

        .card-title h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
        }

        .danger-zone {
          border-color: var(--danger-light);
        }

        .danger-zone .card-title h4 {
          color: var(--danger);
        }

        .danger-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
        }

        .danger-info p {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .system-permission-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background-color: var(--bg-inset);
          border-radius: var(--radius-md);
          margin-bottom: 20px;
        }

        .permission-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .permission-status.success {
          color: var(--success);
        }

        .permission-status.error {
          color: var(--danger);
        }

        .permission-btn {
          align-self: flex-start;
          padding: 8px 16px;
          border: 1px solid var(--primary);
          color: var(--primary);
          border-radius: var(--radius-md);
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .permission-btn:hover {
          background-color: var(--primary);
          color: white;
        }

        .permission-hint {
          font-size: 12px;
          color: var(--text-tertiary);
          line-height: 1.4;
        }

        .inline-time-desc {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .inline-time-input {
          background-color: var(--bg-primary);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: inherit;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        
        .inline-time-input:focus {
          border-color: var(--primary);
        }

        .inline-time-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .form-group input, .form-group select {
          padding: 10px 12px;
          border: 1px solid var(--border);
          background-color: var(--bg-inset);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          outline: none;
        }

        .form-group input:focus, .form-group select:focus {
          border-color: var(--border-focus);
        }

        .form-group select option {
          background-color: var(--bg-elevated);
          color: var(--text-primary);
        }

        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px dashed var(--border);
        }

        .toggle-info h5 {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .toggle-info p {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 2px;
          max-width: 80%;
          line-height: 1.4;
        }

        .btn-primary {
          align-self: flex-start;
          background-color: var(--primary);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
        }

        .btn-primary:hover {
          background-color: var(--primary-hover);
        }

        .danger-zone-card {
          border-color: rgba(239, 68, 68, 0.2);
        }

        .danger-text {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .btn-danger {
          align-self: flex-start;
          background-color: transparent;
          border: 1px solid var(--danger);
          color: var(--danger);
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-danger:hover {
          background-color: var(--danger-light);
          border-color: transparent;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
        }

        .modal-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 500px;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
        }

        .password-confirm-form {
          background-color: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        .password-confirm-form h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .password-confirm-form p {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid var(--border);
          padding-top: 16px;
        }

        .btn-danger-confirm {
          background-color: var(--danger);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-danger-confirm:hover:not(:disabled) {
          background-color: #e63f35;
        }

        .btn-danger-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background-color: var(--bg-inset);
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .settings-grid {
            gap: 16px;
          }
          .section-card {
            padding: 16px;
          }
          .form-actions {
            flex-direction: column;
          }
          .btn-save, .btn-primary {
            width: 100%;
            justify-content: center;
          }
          .danger-actions {
            flex-direction: column;
          }
          .danger-actions .btn-danger {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
