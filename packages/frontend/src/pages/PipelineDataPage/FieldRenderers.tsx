/**
 * Pipeline 步骤数据字段渲染器
 * 根据字段类型和步骤编号，将 JSON 数据渲染为合适的 UI 控件
 */

import { useState } from 'react';

// ─── 类型定义 ──────────────────────────────────────────────────

export type FieldType =
  | 'shortText'
  | 'longText'
  | 'stringArray'
  | 'asinList'
  | 'objectMap'
  | 'imageArray'
  | 'rawJson'
  | 'number'
  | 'empty';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  value: unknown;
  warning?: string;
  childFields?: FieldDefinition[]; // for arrays of objects or nested data
}

// ─── 通用渲染组件 ──────────────────────────────────────────────

function WarningBadge({ message }: { message: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200" title={message}>
      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      <span className="max-w-[200px] truncate">{message}</span>
    </span>
  );
}

function EmptyField() {
  return <span className="text-gray-300 text-sm">—</span>;
}

function ShortTextField({ value }: { value: string }) {
  if (!value) return <EmptyField />;
  return <span className="text-sm text-gray-900 break-all">{value}</span>;
}

function NumberField({ value }: { value: number }) {
  return <span className="text-sm font-medium text-gray-900">{value.toLocaleString()}</span>;
}

function LongTextField({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!value) return <EmptyField />;

  const isLong = value.length > 200;
  const display = isLong && !expanded ? value.slice(0, 200) + '...' : value;

  return (
    <div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap break-all leading-relaxed">{display}</p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 hover:text-blue-800 mt-1"
        >
          {expanded ? '收起' : `展开全部 (${value.length} 字符)`}
        </button>
      )}
    </div>
  );
}

function StringArrayField({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <EmptyField />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 max-w-full"
          title={item}
        >
          <span className="truncate">{item}</span>
        </span>
      ))}
    </div>
  );
}

function AsinChipList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <EmptyField />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {items.map((asin, i) => (
        <a
          key={i}
          href={`https://www.amazon.com/dp/${asin}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-blue-600 hover:text-blue-800 bg-gray-50 px-2 py-1.5 rounded border border-gray-200 hover:border-blue-300 transition-colors truncate"
          title={asin}
        >
          {asin}
        </a>
      ))}
    </div>
  );
}

function ImageArrayField({ images }: { images: string[] }) {
  if (!images || images.length === 0) return <EmptyField />;
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
      {images.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={`图片 ${i + 1}`}
            className="w-full h-20 object-cover rounded border border-gray-200 hover:border-blue-400 transition-colors"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}

function ObjectMapField({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs);
  if (entries.length === 0) return <EmptyField />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
      {entries.map(([key, value]) => (
        <ObjectMapEntry key={key} fieldKey={key} value={value} />
      ))}
    </div>
  );
}

function ObjectMapEntry({ fieldKey, value }: { fieldKey: string; value: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > 500;
  const isSuspicious = value.length > 500 && (value.includes('function') || value.includes('P.when') || value.includes('dpAcr'));
  const display = isLong && !expanded ? value.slice(0, 200) + '...' : value;

  return (
    <div className="flex items-start gap-2 text-xs py-0.5">
      <span className="text-gray-500 shrink-0 min-w-[160px] truncate" title={fieldKey}>{fieldKey}</span>
      <span className={`break-all font-mono ${isSuspicious ? 'text-red-500' : 'text-gray-900'}`}>
        {display}
      </span>
      {isSuspicious && !expanded && (
        <WarningBadge message="可能包含非结构化数据" />
      )}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-blue-600 hover:text-blue-800 shrink-0"
        >
          {expanded ? '收起' : '展开'}
        </button>
      )}
    </div>
  );
}

function RawJsonField({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          查看 Raw JSON ({value.length} 字符)
        </button>
      )}
      {expanded && (
        <div>
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-blue-600 hover:text-blue-800 mb-2"
          >
            收起
          </button>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 max-h-64 overflow-auto text-xs whitespace-pre-wrap break-all">
            {value}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── 字段渲染调度 ──────────────────────────────────────────────

export function FieldRenderer({ field }: { field: FieldDefinition }) {
  const { label, type, value, warning, childFields } = field;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
        {warning && <WarningBadge message={warning} />}
      </div>
      <div className="pl-1">
        {type === 'empty' && <EmptyField />}
        {type === 'shortText' && <ShortTextField value={String(value ?? '')} />}
        {type === 'number' && <NumberField value={Number(value)} />}
        {type === 'longText' && <LongTextField value={String(value ?? '')} />}
        {type === 'stringArray' && <StringArrayField items={Array.isArray(value) ? value as string[] : []} />}
        {type === 'asinList' && <AsinChipList items={Array.isArray(value) ? value as string[] : []} />}
        {type === 'imageArray' && <ImageArrayField images={Array.isArray(value) ? value as string[] : []} />}
        {type === 'objectMap' && <ObjectMapField specs={(value as Record<string, string>) ?? {}} />}
        {type === 'rawJson' && <RawJsonField value={String(value ?? '')} />}
        {childFields && childFields.length > 0 && (
          <div className="space-y-3 pl-2 border-l-2 border-gray-200">
            {childFields.map((cf, i) => (
              <FieldRenderer key={i} field={cf} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 步骤感知的字段分类 ────────────────────────────────────────

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

const STEP_LABELS: Record<string, string> = {
  source: '数据来源',
  url: 'URL',
  title: '标题',
  price: '价格',
  description: '描述',
  images: '图片',
  specifications: '产品规格',
  asin: 'ASIN',
  brand: '品牌',
  rating: '评分',
  reviewCount: '评论数',
  bulletPoints: '五点描述',
  longDescription: '长描述',
  bestSellersRank: '畅销排名',
  colors: '颜色',
  timestamp: '时间戳',
  analyses: 'AI 分析结果',
  searchKeywords: '搜索关键词',
  templateUsed: '使用模板',
  model: '模型',
  keyword: '搜索关键词',
  asins: 'ASIN 列表',
  links: '商品链接',
  total: '结果总数',
  totalKeywords: '关键词总数',
  keywords: '关键词列表',
  optimizedTitle: '优化标题',
  optimizedBulletPoints: '优化五点描述',
  optimizedLongDescription: '优化长描述',
  seoKeywords: 'SEO 关键词',
  competitorAnalysis: '竞品分析',
  rawResponse: '原始响应',
  fallbackTitle: '回退标题',
  step4Title: '竞品标题',
  keywordsCount: '关键词数量',
  stepName: '步骤名称',
  stepNum: '步骤编号',
  status: '状态',
  durationMs: '耗时',
  mock: 'Mock',
  headless: '无头模式',
  skipTo: '跳到步骤',
  envPath: '环境变量路径',
  passed: '通过',
  failed: '失败',
  skipped: '跳过',
  runId: '运行 ID',
  startTime: '开始时间',
  endTime: '结束时间',
  totalDurationMs: '总耗时',
};

function getLabel(key: string): string {
  return STEP_LABELS[key] || key;
}

export function classifyStepFields(data: Record<string, unknown>, stepNum: number, dataType: 'input' | 'output'): FieldDefinition[] {
  if (!data || typeof data !== 'object') return [];

  // 输入数据使用通用分类
  if (dataType === 'input') {
    return classifyGenericFields(data);
  }

  // 输出数据按步骤分类
  const entries = Object.entries(data);

  switch (stepNum) {
    case 1:
      return classifyStep1Output(entries);
    case 2:
      return classifyStep2Output(entries);
    case 3:
      return classifyStep3Output(entries);
    case 4:
      return classifyStep4Output(entries);
    case 5:
      return classifyStep5Output(entries);
    case 6:
      return classifyStep6Output(entries);
    default:
      return classifyGenericFields(data);
  }
}

function classifyGenericFields(data: Record<string, unknown>): FieldDefinition[] {
  return Object.entries(data).map(([key, value]) => {
    if (isEmpty(value)) return { key, label: getLabel(key), type: 'empty', value };

    if (typeof value === 'number') return { key, label: getLabel(key), type: 'number', value };

    if (typeof value === 'string') {
      return value.length > 200
        ? { key, label: getLabel(key), type: 'longText', value }
        : { key, label: getLabel(key), type: 'shortText', value };
    }

    if (Array.isArray(value)) {
      // 检查是否是 URL 数组
      if (value.every(v => typeof v === 'string' && v.startsWith('http'))) {
        return { key, label: getLabel(key), type: 'imageArray', value };
      }
      // 检查是否是 ASIN 数组
      if (value.every(v => typeof v === 'string' && /^[A-Z0-9]{10}$/.test(v))) {
        return { key, label: getLabel(key), type: 'asinList', value };
      }
      return { key, label: getLabel(key), type: 'stringArray', value };
    }

    if (typeof value === 'object') {
      return { key, label: getLabel(key), type: 'objectMap', value };
    }

    return { key, label: getLabel(key), type: 'shortText', value: String(value) };
  });
}

function classifyStep1Output(entries: [string, unknown][]): FieldDefinition[] {
  return entries.map(([key, value]) => {
    const base: FieldDefinition = { key, label: getLabel(key), type: 'shortText', value };

    if (key === 'title') return { ...base, type: 'longText' };
    if (key === 'price' || key === 'description') {
      return { ...base, type: isEmpty(value) ? 'empty' : 'shortText', warning: isEmpty(value) ? 'GigaB2B 页面未展示该字段' : undefined };
    }
    if (key === 'images') return { ...base, type: 'imageArray', value: value as string[] };
    if (key === 'specifications') return { ...base, type: 'objectMap' };
    if (key === 'url') return { ...base, type: 'shortText', value: value as string };

    return base;
  });
}

function classifyStep2Output(entries: [string, unknown][]): FieldDefinition[] {
  return entries.map(([key, value]) => {
    const base: FieldDefinition = { key, label: getLabel(key), type: 'shortText', value };

    if (key === 'analyses') {
      const items = Array.isArray(value) ? value as string[] : [];
      if (items.length === 0) return { ...base, type: 'empty' };
      // 每个分析结果作为独立的 longText 子字段
      return {
        key, label: getLabel(key), type: 'stringArray', value: items,
        childFields: items.map((item, i) => ({
          key: `analyses[${i}]`,
          label: `分析 ${i + 1}`,
          type: 'longText' as FieldType,
          value: item,
        })),
      };
    }
    if (key === 'searchKeywords') return { ...base, type: 'stringArray' };

    return base;
  });
}

function classifyStep3Output(entries: [string, unknown][]): FieldDefinition[] {
  return entries.map(([key, value]) => {
    const base: FieldDefinition = { key, label: getLabel(key), type: 'shortText', value };

    if (key === 'asins') return { ...base, type: 'asinList' };
    if (key === 'links') return { ...base, type: 'stringArray' };
    if (key === 'total') return { ...base, type: 'number' };

    return base;
  });
}

function classifyStep4Output(entries: [string, unknown][]): FieldDefinition[] {
  return entries.map(([key, value]) => {
    const base: FieldDefinition = { key, label: getLabel(key), type: 'shortText', value };

    if (key === 'title' || key === 'longDescription') return { ...base, type: 'longText' };
    if (key === 'url') return { ...base, type: 'shortText' };
    if (key === 'brand') {
      return {
        ...base, type: isEmpty(value) ? 'empty' : 'shortText',
        warning: isEmpty(value) ? '品牌提取失败 — 存在于 Item Details.Brand Name' : undefined,
      };
    }
    if (key === 'bulletPoints') return { ...base, type: 'stringArray' };
    if (key === 'images') return { ...base, type: 'imageArray' };
    if (key === 'specifications') return { ...base, type: 'objectMap' };
    if (key === 'bestSellersRank') {
      return {
        ...base, type: Array.isArray(value) && value.length > 0 ? 'stringArray' : 'empty',
        warning: Array.isArray(value) && value.length === 0 ? '从 specifications 解析失败' : undefined,
      };
    }
    if (key === 'colors') {
      return {
        ...base, type: Array.isArray(value) && value.length > 0 ? 'stringArray' : 'empty',
        warning: Array.isArray(value) && value.length === 0 ? '未提取到颜色变体' : undefined,
      };
    }
    if (key === 'total') return { ...base, type: 'number' };

    return base;
  });
}

function classifyStep5Output(entries: [string, unknown][]): FieldDefinition[] {
  return entries.map(([key, value]) => {
    const base: FieldDefinition = { key, label: getLabel(key), type: 'shortText', value };

    if (key === 'totalKeywords') {
      return {
        ...base, type: 'number',
        warning: value === 0 ? 'Xiyouzhaoci CSV 解析返回 0 个关键词' : undefined,
      };
    }
    if (key === 'keywords') {
      return {
        ...base, type: Array.isArray(value) && value.length > 0 ? 'stringArray' : 'empty',
        warning: Array.isArray(value) && value.length === 0 ? 'Xiyouzhaoci CSV 解析返回 0 个关键词' : undefined,
      };
    }

    return base;
  });
}

function classifyStep6Output(entries: [string, unknown][]): FieldDefinition[] {
  return entries.map(([key, value]) => {
    const base: FieldDefinition = { key, label: getLabel(key), type: 'shortText', value };

    if (key === 'optimizedTitle' || key === 'optimizedLongDescription' || key === 'competitorAnalysis') {
      return { ...base, type: 'longText' };
    }
    if (key === 'optimizedBulletPoints') return { ...base, type: 'stringArray' };
    if (key === 'seoKeywords') return { ...base, type: 'stringArray' };
    if (key === 'rawResponse') {
      return { ...base, type: 'rawJson', warning: 'DOM 提取可能包含 "Gemini 说" 前缀' };
    }

    return base;
  });
}

// ─── 工具函数 ──────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}m ${sec}s`;
}

export function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
