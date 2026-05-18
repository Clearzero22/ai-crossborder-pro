import type { ReactNode } from 'react';
import PlanAlert from './PlanAlert';
import UpdateNotifier from './UpdateNotifier';

interface LayoutProps {
  sidebar: ReactNode;
  header: ReactNode;
  mainContent: ReactNode;
  userOverlay: ReactNode;
  mobileSidebarOpen: boolean;
  onMobileSidebarClose: () => void;
}

export default function Layout({ sidebar, header, mainContent, userOverlay, mobileSidebarOpen, onMobileSidebarClose }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden text-gray-800">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onMobileSidebarClose} />
      )}

      {/* Sidebar: mobile drawer + desktop static */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {sidebar}
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        <PlanAlert />
        <UpdateNotifier />
        {header}
        {mainContent}
      </main>
      {userOverlay}
    </div>
  );
}
