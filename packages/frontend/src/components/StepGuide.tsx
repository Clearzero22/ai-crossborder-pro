import type { StepGuideItem } from '../types';

interface StepGuideProps {
  items: StepGuideItem[];
}

export default function StepGuide({ items }: StepGuideProps) {
  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-lg border border-gray-200 px-8 py-4 flex items-center gap-8">
      {items.map(item => (
        <div key={item.step} className="guide-step flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            item.completed
              ? 'bg-blue-500 text-white'
              : item.step === 4
                ? 'bg-orange-400 text-white'
                : item.step === 5
                  ? 'bg-gray-200 text-gray-500'
                  : 'bg-blue-500 text-white'
          }`}>
            {item.step}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{item.title}</div>
            <div className="text-xs text-gray-500">{item.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
