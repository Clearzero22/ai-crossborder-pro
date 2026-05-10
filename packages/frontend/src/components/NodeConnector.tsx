import type { NodeStatus } from '../types';

interface NodeConnectorProps {
  status?: NodeStatus;
}

const lineColors: Record<string, string> = {
  success: '#22C55E',
  running: '#3B82F6',
  error: '#EF4444',
};

export default function NodeConnector({ status }: NodeConnectorProps) {
  const color = status ? lineColors[status] || '#D1D5DB' : '#D1D5DB';

  return (
    <>
      <div
        className="workflow-line"
        style={{
          background: status === 'running'
            ? `linear-gradient(to bottom, ${color}, ${color})`
            : `linear-gradient(to bottom, ${color}, ${color})`,
          transition: 'background 0.3s ease',
        }}
      />
      <div
        className="workflow-arrow"
        style={{
          borderTopColor: color,
          transition: 'border-top-color 0.3s ease',
        }}
      />
    </>
  );
}
