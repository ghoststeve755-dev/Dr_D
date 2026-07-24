// src/components/layout/ClientLayoutWrapper.tsx

'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNav from './MobileNav';

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    // Check initial session
    async function checkSession() {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (!currentSession && !isAuthPage) {
        router.push('/login');
      } else if (currentSession && isAuthPage) {
        router.push('/');
      }
      setLoading(false);
    }
    
    checkSession();

    // Register Service Worker for PWA / push notifications
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registered: ', registration.scope);
          },
          (err) => {
            console.log('SW registration failed: ', err);
          }
        );
      });
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (!newSession && !isAuthPage) {
          router.push('/login');
        } else if (newSession && isAuthPage) {
          router.push('/');
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, isAuthPage, router]);

  // Ref for holding notification settings without triggering re-renders
  const [notifSettings, setNotifSettings] = useState<any>(null);

  useEffect(() => {
    if (session?.user?.id) {
      supabase.from('notification_settings').select('*').eq('user_id', session.user.id).maybeSingle()
        .then(({ data }) => setNotifSettings(data))
        .catch(() => {});
    }
  }, [session]);

  // Local Notification Timer (No DB polling)
  useEffect(() => {
    if (!notifSettings || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

    let lastNotifiedDate = '';
    
    const checkReminders = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const targetTime = notifSettings.daily_time ? notifSettings.daily_time.substring(0, 5) : '19:00'; // "HH:MM"
      const todayStr = now.toDateString();
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const isLastDayOfMonth = now.getDate() === totalDaysInMonth;

      if (currentTime === targetTime && lastNotifiedDate !== todayStr) {
        lastNotifiedDate = todayStr;
        
        // 1. Daily
        if (notifSettings.daily_reminder) {
          new Notification('Doctor D', { body: 'Time to log your daily journal!', icon: '/icon.svg' });
        }
        
        // 2. Weekly (Sunday)
        if (notifSettings.weekly_reminder && dayName === 'Sunday') {
          setTimeout(() => {
            new Notification('Doctor D', { body: 'Time for your Weekly Review!', icon: '/icon.svg' });
          }, 2000); // 2 second stagger
        }
        
        // 3. Monthly (Last day of month)
        if (notifSettings.monthly_reminder && isLastDayOfMonth) {
          setTimeout(() => {
            new Notification('Doctor D', { body: 'Time for your Monthly Report!', icon: '/icon.svg' });
          }, 4000); // 4 second stagger
        }
      }
    };

    const intervalId = setInterval(checkReminders, 60000); // Check local time every minute
    setTimeout(checkReminders, 5000); // Initial check

    return () => clearInterval(intervalId);
  }, [notifSettings]);

  if (loading || (!session && !isAuthPage)) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <p>{!session && !isAuthPage ? 'Redirecting to login...' : 'Loading Discipline OS...'}</p>
        <style jsx>{`
          .spinner-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100vw;
            height: 100vh;
            background-color: var(--bg-elevated);
            color: var(--text-secondary);
            gap: 16px;
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 2px solid var(--border);
            border-top: 2px solid var(--primary);
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Auth pages don't show sidebars/headers
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content-wrapper">
        <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
        <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <main className="main-content">{children}</main>
      </div>

      <style jsx>{`
        .app-layout {
          display: flex;
          width: 100vw;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .main-content-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-left: var(--sidebar-width);
          min-height: 100vh;
          overflow-x: hidden;
          min-width: 0;
        }

        .main-content {
          margin-top: var(--header-height);
          padding: 28px 32px;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: var(--bg-base);
          min-width: 0;
        }

        @media (max-width: 768px) {
          .main-content-wrapper {
            margin-left: 0;
          }

          .main-content {
            padding: 16px;
          }
        }

        @media (max-width: 480px) {
          .main-content {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}
