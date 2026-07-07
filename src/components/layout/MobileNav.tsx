// src/components/layout/MobileNav.tsx

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  X,
  LayoutDashboard, 
  BookOpen, 
  Settings, 
  BarChart3, 
  Calendar, 
  CalendarDays, 
  LogOut, 
  CheckSquare,
  Sprout
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

const MENU_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Daily Journal', path: '/journal', icon: BookOpen },
  { name: 'Habit Manager', path: '/habits', icon: CheckSquare },
  { name: 'Weekly Review', path: '/weekly', icon: Calendar },
  { name: 'Monthly Report', path: '/monthly', icon: CalendarDays },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState('Doctor D');
  const [initial, setInitial] = useState('D');

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();
      if (data?.name) {
        setUsername(data.name);
        setInitial(data.name[0]?.toUpperCase() || 'D');
      }
    }
    getUser();
    onClose(); // Close nav on path change
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="mobilenav-overlay">
      <div className="mobilenav-backdrop" onClick={onClose}></div>
      <div className="mobilenav-content animate-fade-in">
        <div className="mobilenav-header">
          <div className="brand-icon"><Sprout size={20} strokeWidth={2.5} /></div>
          <span className="brand-name">Doctor D</span>
          <button onClick={onClose} className="close-btn" aria-label="Close Menu">
            <X size={18} />
          </button>
        </div>

        <nav className="mobilenav-links">
          <div className="nav-section-label">MENU</div>
          {MENU_ITEMS.map((item) => {
            const active = item.path === '/'
              ? pathname === '/'
              : pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`nav-link ${active ? 'nav-link--active' : ''}`}
              >
                <Icon size={16} className="nav-icon" strokeWidth={active ? 2.5 : 2} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mobilenav-footer">
          <div className="user-row">
            <div className="user-avatar">{initial}</div>
            <div className="user-meta">
              <span className="user-name">{username}</span>
              <span className="user-status">Active</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn" aria-label="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .mobilenav-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 200;
          display: flex;
        }

        .mobilenav-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
        }

        .mobilenav-content {
          position: relative;
          width: 280px;
          height: 100%;
          background-color: var(--bg-surface);
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-lg);
          border-right: 1px solid var(--border);
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        .mobilenav-header {
          height: var(--header-height);
          display: flex;
          align-items: center;
          padding: 0 28px;
          gap: 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .brand-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: var(--primary);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .brand-name {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.3px;
        }

        .close-btn {
          margin-left: auto;
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 6px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.12s;
        }

        .close-btn:hover {
          background-color: var(--bg-inset);
          color: var(--text-primary);
        }

        .mobilenav-links {
          flex: 1;
          padding: 16px 10px 16px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        .nav-section-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-tertiary);
          letter-spacing: 0.08em;
          padding: 0 28px;
          margin-bottom: 6px;
          margin-top: 4px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          justify-content: center; /* Horizontally center */
          gap: 16px;
          padding: 12px 14px;
          margin: 0 16px; /* Add margin to keep it pill-shaped instead of full-width edge */
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 13.5px;
          font-weight: 500;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          cursor: pointer;
          width: calc(100% - 32px); /* Account for margin */
        }

        .nav-link:hover {
          background-color: var(--bg-inset);
          color: var(--text-primary);
          transform: translateX(2px);
        }

        .nav-link--active {
          background-color: var(--primary);
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .nav-link--active:hover {
          background-color: var(--primary-hover);
          color: white;
          transform: none;
        }

        .nav-icon {
          flex-shrink: 0;
          opacity: 0.8;
          width: 18px; /* Fixed width for better visual alignment */
        }

        .nav-link--active .nav-icon {
          opacity: 1;
        }

        .mobilenav-footer {
          padding: 14px 28px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          background-color: transparent;
        }

        .user-row {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .user-meta {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-status {
          font-size: 11px;
          color: var(--success);
          font-weight: 500;
        }

        .logout-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-tertiary);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .logout-btn:hover {
          color: var(--danger);
          background-color: var(--danger-light);
          border-color: transparent;
        }
      `}</style>
    </div>
  );
}
