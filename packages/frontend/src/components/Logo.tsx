interface LogoProps {
  collapsed?: boolean;
}

export default function Logo({ collapsed }: LogoProps) {
  return (
    <div className={`border-b border-gray-100 ${collapsed ? 'p-3' : 'p-4'}`}>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
        <div className="w-8 h-8 rounded-lg gradient-blue flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        {!collapsed && (
          <div className="truncate">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-gray-900">AI CrossBorder</span>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded">Pro</span>
            </div>
            <div className="text-[11px] text-gray-500">AI 跨境电商自动化</div>
          </div>
        )}
      </div>
    </div>
  );
}
