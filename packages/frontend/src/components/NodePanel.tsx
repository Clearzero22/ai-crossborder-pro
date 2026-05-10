import { useState } from 'react';
import NodeSearch from './NodeSearch';
import NodeGroup from './NodeGroup';
import type { NodeGroup as NodeGroupType } from '../types';

interface NodePanelProps {
  groups: NodeGroupType[];
  onAddNode?: (pluginId: string) => void;
  workflowNodeIds?: string[];
}

export default function NodePanel({ groups, onAddNode, workflowNodeIds }: NodePanelProps) {
  const [searchText, setSearchText] = useState('');

  const filteredGroups = searchText.trim()
    ? groups.map(g => ({
        ...g,
        items: g.items.filter(item =>
          item.label.toLowerCase().includes(searchText.toLowerCase())
        ),
      })).filter(g => g.items.length > 0)
    : groups;

  return (
    <div className="w-full lg:w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-sm text-gray-900">添加节点</span>
        <span className="text-xs text-gray-400">点击节点添加到工作流</span>
      </div>
      <NodeSearch value={searchText} onChange={setSearchText} />
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4">
        {filteredGroups.map(group => (
          <NodeGroup
            key={group.id}
            label={group.label}
            color={group.color}
            items={group.items.map(item => ({
              ...item,
              disabled: workflowNodeIds?.includes(item.id),
            }))}
            onItemClick={onAddNode ? (id) => onAddNode(id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
