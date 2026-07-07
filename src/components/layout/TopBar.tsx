'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Plus } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/':         'Dashboard',
  '/journal':  'Daily Journal',
  '/habits':   'Habits',
  '/weekly':   'Weekly Review',
  '/monthly':  'Monthly Report',
  '/analytics':'Analytics',
  '/settings': 'Settings',
};

export default function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dateStr, setDateStr] = useState('');

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  )?.[1] ?? 'Doctor D';

  useEffect(() => {
    const now = new Date();
    setDateStr(now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    }));
  }, [pathname]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          onClick={onMenuClick}
          className="topbar-menu-btn"
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>
        <div className="topbar-title-group">
          <h2 className="topbar-title">{pageTitle}</h2>
          <span className="topbar-date">{dateStr}</span>
        </div>
      </div>

      <div className="topbar-right">
        {pathname !== '/journal' && (
          <button
            onClick={() => router.push('/journal')}
            className="topbar-cta"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Log Today</span>
          </button>
        )}
      </div>

      <style jsx>{`
        .topbar {
          height: var(--header-height);
          background-color: var(--bg-surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: fixed;
          top: 0;
          right: 0;
          left: var(--sidebar-width);
          z-index: 90;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .topbar-menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: var(--radius-xs);
          transition: background-color 0.12s;
        }

        .topbar-menu-btn:hover {
          background-color: var(--bg-inset);
          color: var(--text-primary);
        }

        .topbar-title-group {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .topbar-title {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.3px;
          line-height: 1.2;
        }

        .topbar-date {
          font-size: 11px;
          color: var(--text-tertiary);
          font-weight: 500;
          letter-spacing: 0.01em;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .topbar-cta {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          background-color: var(--primary);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          letter-spacing: -0.01em;
        }

        .topbar-cta:hover { opacity: 0.88; }
        .topbar-cta:active { transform: scale(0.98); }

        @media (max-width: 768px) {
          .topbar {
            left: 0;
            padding: 0 16px;
          }
          .topbar-menu-btn { display: flex; }
          .topbar-cta span { display: none; }
          .topbar-cta { padding: 8px; border-radius: 50%; }
        }
      `}</style>
    </header>
  );
}
