interface TestButtonProps {
  disabled?: boolean;
  onTest: () => void;
}

export default function TestButton({ disabled, onTest }: TestButtonProps) {
  return (
    <div className="pt-4 border-t border-gray-200">
      <div className="text-xs text-gray-500 mb-2">测试此节点</div>
      <div className="text-xs text-gray-400 mb-3">点击测试按钮，运行此节点看看效果</div>
      <button
        onClick={onTest}
        disabled={disabled}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-opacity flex items-center justify-center gap-2 shadow-sm ${
          disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
            : 'gradient-blue text-white hover:opacity-90 shadow-blue-200'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        测试运行
      </button>
    </div>
  );
}
