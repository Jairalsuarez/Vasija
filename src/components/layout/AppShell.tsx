import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <div className="min-h-screen bg-white text-gray-950 dark:bg-[var(--theme-bg)] dark:text-[var(--theme-text-primary)]">
      <Sidebar />
      <div className="md:ml-64">
        <TopBar />
        <main className="w-full max-w-7xl mx-auto px-3 py-4 pb-24 sm:px-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
