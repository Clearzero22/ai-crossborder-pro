import Logo from './Logo';
import NavMenu from './NavMenu';
import PlanInfo from './PlanInfo';
import type { NavItem } from '../types';

interface SidebarProps {
  navItems: NavItem[];
  activeNavId: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavSelect: (id: string) => void;
  onUpgrade?: () => void;
  onMobileClose?: () => void;
}

export default function Sidebar({ navItems, activeNavId, collapsed, onToggle, onNavSelect, onUpgrade, onMobileClose }: SidebarProps) {
  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-200 h-full w-56 lg:${
      collapsed ? 'w-16' : 'w-56'
    }`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <Logo collapsed={false} />
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <NavMenu items={navItems} activeId={activeNavId} collapsed={collapsed} onSelect={(id) => { onNavSelect(id); onMobileClose?.(); }} />
      <PlanInfo collapsed={collapsed} onUpgrade={onUpgrade} />
      {/* Desktop toggle button */}
      <button
        onClick={onToggle}
        className="hidden lg:flex w-full py-3 border-t border-gray-200 items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        title={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        <svg
          className="w-4 h-4 transition-transform duration-200"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </aside>
  );
}
