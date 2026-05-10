import type { ConfigSection as ConfigSectionType } from '../types';

interface ConfigSectionProps {
  section: ConfigSectionType;
}

export default function ConfigSection({ section }: ConfigSectionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 bg-blue-500 rounded-full" />
        <h4 className="text-sm font-semibold text-gray-900">{section.title}</h4>
      </div>
      <div className="space-y-3">
        {section.fields.map((field, i) => {
          switch (field.type) {
            case 'select':
              return (
                <div key={i}>
                  <label className="block text-xs text-gray-600 mb-1.5">{field.label}</label>
                  <div className="relative">
                    <select
                      className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      defaultValue={String(field.value)}
                    >
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <svg className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              );
            case 'text':
              return (
                <div key={i}>
                  <label className="block text-xs text-gray-600 mb-1.5">{field.label}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue={String(field.value)}
                      className="flex-1 pl-3 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            case 'checkbox':
              return (
                <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" defaultChecked={Boolean(field.value)} className="custom-checkbox" />
                  <span className="text-sm text-gray-700">{field.label}</span>
                  {field.label.includes('防检测') && (
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </label>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
