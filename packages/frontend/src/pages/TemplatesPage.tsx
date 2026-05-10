import { useState } from 'react';
import { workflowTemplates, templateCategories } from '../data/templates';

interface TemplatesPageProps {
  onLoadTemplate: (templateId: string) => void;
}

export default function TemplatesPage({ onLoadTemplate }: TemplatesPageProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = workflowTemplates.filter(t => {
    const matchCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchSearch = !search || t.name.includes(search) || t.description.includes(search);
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">模板市场</h1>
          <p className="text-sm text-gray-500 mt-1">浏览预设工作流模板，快速开始自动化任务</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {templateCategories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                c.id === activeCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="搜索模板..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
              <div className={`h-2 bg-gradient-to-r ${t.gradient}`} />
              <div className="p-5 space-y-3">
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                  {t.categoryLabel}
                </span>

                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{t.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{t.nodeIds.length} 个节点</span>
                </div>

                <button
                  onClick={() => onLoadTemplate(t.id)}
                  className="w-full py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  使用模板
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">没有找到合适的模板？</h3>
              <p className="text-sm text-gray-500 mt-1">可以从空白创建工作流，或联系我们提交模板需求</p>
            </div>
            <button
              onClick={() => onLoadTemplate('ai-copywriting')}
              className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700 transition-colors"
            >
              新建工作流
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
