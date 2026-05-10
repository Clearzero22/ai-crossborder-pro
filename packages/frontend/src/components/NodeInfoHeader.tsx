import type { WorkflowNode, StepOutput } from '../types';

interface NodeInfoHeaderProps {
  node: WorkflowNode | undefined;
  output?: StepOutput;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return String(value);
}

function OutputData({ output }: { output: StepOutput }) {
  const entries = Object.entries(output.data);
  if (entries.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="text-xs font-medium text-gray-500 mb-2">执行结果</div>
      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
        {entries.slice(0, 6).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="text-gray-400 shrink-0 w-24 truncate">{key}:</span>
            <span className="text-gray-700 break-all">{formatValue(value)}</span>
          </div>
        ))}
        {entries.length > 6 && (
          <div className="text-xs text-gray-400">...还有 {entries.length - 6} 个字段</div>
        )}
      </div>
    </div>
  );
}

export default function NodeInfoHeader({ node, output }: NodeInfoHeaderProps) {
  if (!node) {
    return <div className="p-4 text-sm text-gray-500">请选择一个节点</div>;
  }

  return (
    <>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4" />
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" fill="white" />
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" fill="#EA4335" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{node.label}</h3>
            <button className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">{node.description}</p>
        </div>
      </div>
      {output && <OutputData output={output} />}
    </>
  );
}
