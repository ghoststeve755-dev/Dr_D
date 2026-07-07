'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  BarChart3,
  CalendarDays,
  Calendar,
  CheckSquare,
  LogOut,
  Sprout
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

const NAV = [
  { name: 'Dashboard',      path: '/',         icon: LayoutDashboard },
  { name: 'Daily Journal',  path: '/journal',  icon: BookOpen },
  { name: 'Habits',         path: '/habits',   icon: CheckSquare },
  { name: 'Weekly Review',  path: '/weekly',   icon: Calendar },
  { name: 'Monthly Report', path: '/monthly',  icon: CalendarDays },
  { name: 'Analytics',      path: '/analytics',icon: BarChart3 },
  { name: 'Settings',       path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState('Doctor D');
  const [initial, setInitial] = useState('D');

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('users').select('name').eq('id', user.id).single();
      if (data?.name) {
        setUsername(data.name);
        setInitial(data.name[0]?.toUpperCase() || 'D');
      }
    }
    getUser();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon"><Sprout size={20} strokeWidth={2.5} /></div>
        <span className="brand-name">Doctor D</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">MENU</div>
        {NAV.map(item => {
          const active = item.path === '/'
            ? pathname === '/'
            : pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${active ? 'nav-item--active' : ''}`}
            >
              <Icon size={16} className="nav-item-icon" strokeWidth={active ? 2.5 : 2} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
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

      <style jsx>{`
        .sidebar {
          width: var(--sidebar-width);
          background-color: var(--bg-surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
        }

        /* Brand */
        .sidebar-brand {
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

        /* Nav */
        .sidebar-nav {
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

        .nav-item {
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

        .nav-item:hover {
          background-color: var(--bg-inset);
          color: var(--text-primary);
          transform: translateX(2px);
        }

        .nav-item--active {
          background-color: var(--primary);
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .nav-item--active:hover {
          background-color: var(--primary-hover);
          color: white;
          transform: none;
        }

        .nav-item-icon {
          flex-shrink: 0;
          opacity: 0.8;
          width: 18px; /* Fixed width for better visual alignment */
        }

        .nav-item--active .nav-item-icon {
          opacity: 1;
        }

        /* Footer */
        .sidebar-footer {
          padding: 14px 28px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
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

        @media (max-width: 768px) {
          .sidebar { display: none; }
        }
      `}</style>
    </aside>
  );
}
