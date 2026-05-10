import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  workflowName: string;
  status: string;
  zoomLevel: number;
  workflowEnabled: boolean;
  executing: boolean;
  currentStep?: number;
  totalSteps?: number;
  headless: boolean;
  executionMode: 'auto' | 'manual';
  waitingForNext: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitCanvas: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleWorkflow: () => void;
  onRun: () => void;
  onStop: () => void;
  onPublish: () => void;
  onToggleHeadless: () => void;
  onSwitchExecutionMode: (mode: 'auto' | 'manual') => void;
  onNextStep: () => void;
  onMobileMenuToggle?: () => void;
}

export default function Header({
  workflowName, status, zoomLevel, workflowEnabled, executing, currentStep, totalSteps,
  headless, executionMode, waitingForNext,
  onZoomIn, onZoomOut, onFitCanvas,
  onUndo, onRedo, onToggleWorkflow, onRun, onStop, onPublish,
  onToggleHeadless, onSwitchExecutionMode, onNextStep,
  onMobileMenuToggle,
}: HeaderProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 pr-4 lg:pr-48 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger button */}
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium text-gray-900">工作流</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-700">{workflowName}</span>
        </div>
        <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full border border-green-200 font-medium">
          {status}
        </span>
      </div>

      {/* Desktop toolbar */}
      <div className="hidden lg:flex items-center gap-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={onZoomOut} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white hover:shadow-sm text-gray-600 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
          </button>
          <span className="text-xs font-medium text-gray-700 w-10 text-center">{zoomLevel}%</span>
          <button onClick={onZoomIn} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white hover:shadow-sm text-gray-600 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={onUndo} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="撤销">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          </button>
          <button onClick={onRedo} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="重做">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
          </button>
          <button onClick={onFitCanvas} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="适应画布">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${workflowEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
              {workflowEnabled ? '工作流已启用' : '工作流已停用'}
            </span>
            <div className="relative inline-block w-10 h-5 align-middle select-none" onClick={onToggleWorkflow}>
              <input
                type="checkbox"
                checked={workflowEnabled}
                readOnly
                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-gray-300 appearance-none cursor-pointer transition-all duration-200 ease-in-out"
                style={{ top: 0, left: 0, borderWidth: 2 }}
              />
              <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${workflowEnabled ? 'bg-blue-500' : 'bg-gray-300'}`} />
            </div>
          </div>

          {executing && totalSteps ? (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              步骤 {currentStep}/{totalSteps}
            </span>
          ) : null}

          <div className="flex items-center gap-2">
            <span className={`text-sm ${workflowEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
              执行模式
            </span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => onSwitchExecutionMode('auto')}
                disabled={executing}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  executionMode === 'auto'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                } ${executing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                自动
              </button>
              <button
                onClick={() => onSwitchExecutionMode('manual')}
                disabled={executing}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  executionMode === 'manual'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                } ${executing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                手动
              </button>
            </div>
          </div>

          {executionMode === 'manual' && waitingForNext && (
            <button
              onClick={onNextStep}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">等待</div>

              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              下一步
            </button>
          )}

          <button
            onClick={onToggleHeadless}
            disabled={executing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              headless
                ? 'border-gray-300 text-gray-500 hover:bg-gray-50'
                : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
            } ${executing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              {headless
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                : <><path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
            </svg>
            {headless ? '无头模式' : '有头模式'}
          </button>

          {executing ? (
            <button onClick={onStop} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h12v12H6z" /></svg>
              停止
            </button>
          ) : (
            <button onClick={onRun} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              运行
            </button>
          )}

          <button onClick={onPublish} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg gradient-blue text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm shadow-blue-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            发布
          </button>
        </div>
      </div>

      {/* Mobile toolbar */}
      <div className="flex lg:hidden items-center gap-2">
        {executing && totalSteps ? (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {currentStep}/{totalSteps}
          </span>
        ) : null}

        {executing ? (
          <button onClick={onStop} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-300 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h12v12H6z" /></svg>
            停止
          </button>
        ) : (
          <button onClick={onRun} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            运行
          </button>
        )}

        {/* More menu dropdown */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {moreMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={() => { onZoomIn(); setMoreMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                放大
              </button>
              <button
                onClick={() => { onZoomOut(); setMoreMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                缩小
              </button>
              <button
                onClick={() => { onFitCanvas(); setMoreMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                适应画布
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => { onUndo(); setMoreMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                撤销
              </button>
              <button
                onClick={() => { onRedo(); setMoreMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                重做
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => { onToggleHeadless(); setMoreMenuOpen(false); }}
                disabled={executing}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors ${executing ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700'}`}
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  {headless
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    : <><path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
                </svg>
                {headless ? '切换有头模式' : '切换无头模式'}
              </button>
              <button
                onClick={() => { onPublish(); setMoreMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                发布
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
