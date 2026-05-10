/**
 * 节点类型专用数据渲染组件
 * 被 NodeComparison 和 AllDataTable 共用
 */

// ─── 通用 UI 组件 ──────────────────────────────────────────────

export function ImageGrid({ images, max }: { images: string[]; max?: number }) {
  const shown = max ? images.slice(0, max) : images;
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        商品图片 ({images.length})
      </h4>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {shown.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt={`图片 ${i + 1}`}
              className="w-full h-16 object-cover rounded border border-gray-200 hover:border-blue-400 transition-colors"
              loading="lazy"
            />
          </a>
        ))}
        {max && images.length > max && (
          <div className="w-full h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-500">
            +{images.length - max}
          </div>
        )}
      </div>
    </div>
  );
}

export function SpecTable({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs);
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        产品规格 ({entries.length})
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 text-xs py-0.5">
            <span className="text-gray-500 shrink-0 min-w-[140px]">{key}</span>
            <span className="text-gray-900 font-mono break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BulletList({ items, title }: { items: string[]; title: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title} ({items.length})
      </h4>
      <ol className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className="text-gray-400 shrink-0 font-mono">{i + 1}.</span>
            <span className="text-gray-800 break-all">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ConfigInfo({ config }: { config: Record<string, unknown> }) {
  const entries = Object.entries(config);
  if (entries.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">执行配置</h4>
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="text-gray-500 shrink-0 min-w-[80px]">{key}</span>
            <span className="text-gray-800 font-mono break-all">
              {typeof value === 'string' && value.startsWith('http') ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{value.length > 80 ? value.slice(0, 80) + '...' : value}</a>
              ) : (
                String(value)
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenericDataSection({ title, data }: { title: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="font-medium text-gray-500 shrink-0 min-w-[120px]">{key}</span>
            <span className="text-gray-900 font-mono break-all">
              {Array.isArray(value)
                ? JSON.stringify(value, null, 2)
                : typeof value === 'object' && value !== null
                  ? JSON.stringify(value, null, 2)
                  : String(value ?? '-')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 节点类型专用详情渲染器 ──────────────────────────────────

interface StepData {
  node_id: string;
  output_data: Record<string, unknown>;
  input_data: Record<string, unknown> | null;
  config_data: Record<string, unknown> | null;
  error: string | null;
}

export function NodeDetailRenderer({ nodeId, record }: { nodeId: string; record: StepData }) {
  const out = record.output_data;

  // ── GigaB2B 爬虫 ──
  if (nodeId === 'gigab2b-crawl') {
    const images = (out.images as string[]) ?? [];
    const specs = out.specifications as Record<string, string> | undefined;
    const title = out.title as string | undefined;
    const externalId = out.externalId as string | undefined;
    return (
      <div className="space-y-4">
        {title && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">产品标题</h4>
            <p className="text-sm font-medium text-gray-900">{title}</p>
            {externalId ? <span className="text-xs text-gray-400">ID: {externalId}</span> : null}
          </div>
        )}
        {images.length > 0 && <ImageGrid images={images} max={12} />}
        {specs && Object.keys(specs).length > 0 && <SpecTable specs={specs} />}
        {record.config_data && <ConfigInfo config={record.config_data} />}
      </div>
    );
  }

  // ── 亚马逊搜索 ──
  if (nodeId === 'amazon-search') {
    const keyword = out.keyword as string | undefined;
    const total = out.total as number | undefined;
    const asins = (out.asins as string[]) ?? [];
    const links = (out.links as string[]) ?? [];
    return (
      <div className="space-y-4">
        {keyword && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">搜索关键词:</span>
            <span className="text-sm font-medium text-gray-900">{keyword}</span>
            <span className="text-xs text-gray-400">共 {total ?? asins.length} 条结果</span>
          </div>
        )}
        {asins.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              竞品 ASIN 列表 ({asins.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {asins.map((asin, i) => (
                <a
                  key={asin}
                  href={links[i] ?? `https://www.amazon.com/dp/${asin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-blue-600 hover:underline bg-gray-50 px-2 py-1.5 rounded border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  {asin}
                </a>
              ))}
            </div>
          </div>
        )}
        {record.config_data && <ConfigInfo config={record.config_data} />}
      </div>
    );
  }

  // ── 亚马逊商品 ──
  if (nodeId === 'amazon-product') {
    const title = out.title as string | undefined;
    const brand = out.brand as string | undefined;
    const price = out.price as string | undefined;
    const rating = out.rating as string | undefined;
    const images = (out.images as string[]) ?? [];
    const bullets = (out.bulletPoints as string[]) ?? [];
    const specs = (out.specifications as string[]) ?? [];
    return (
      <div className="space-y-4">
        <div>
          {brand ? <div className="text-xs text-gray-500 mb-0.5">{brand}</div> : null}
          {title && <p className="text-sm font-medium text-gray-900">{title}</p>}
          <div className="flex items-center gap-3 mt-1">
            {price ? <span className="text-sm font-bold text-gray-900">{price}</span> : null}
            {rating ? <span className="text-xs text-amber-600">{rating} 星</span> : null}
            {out.asin ? <span className="text-xs text-gray-400 font-mono">ASIN: {String(out.asin)}</span> : null}
          </div>
        </div>
        {images.length > 0 && <ImageGrid images={images} max={8} />}
        {bullets.length > 0 && <BulletList items={bullets} title="五点描述" />}
        {specs.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              产品规格 ({specs.length})
            </h4>
            <div className="space-y-0.5">
              {specs.map((spec, i) => (
                <div key={i} className="text-xs text-gray-700">{spec}</div>
              ))}
            </div>
          </div>
        )}
        {record.config_data && <ConfigInfo config={record.config_data} />}
      </div>
    );
  }

  // ── 西游造词关键词 ──
  if (nodeId === 'xiyouzhaoci-keywords') {
    const asin = out.asin as string | undefined;
    const brand = out.brand as string | undefined;
    const keywords = (out.keywords as string[]) ?? [];
    const topKeyword = out.topKeyword as string | undefined;
    const csvPath = out.csvPath as string | undefined;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {asin ? <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">ASIN: {asin}</span> : null}
          {brand ? <span className="text-xs text-gray-500">{brand}</span> : null}
          {csvPath ? <span className="text-xs text-gray-400">{csvPath}</span> : null}
        </div>
        {topKeyword && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <span className="text-xs text-green-700 font-medium">Top 关键词: </span>
            <span className="text-sm text-green-800 font-medium">{topKeyword}</span>
          </div>
        )}
        {keywords.length > 0 && <BulletList items={keywords} title="关键词列表" />}
        {record.config_data && <ConfigInfo config={record.config_data} />}
      </div>
    );
  }

  // ── AI 优化 ──
  if (nodeId === 'ai-optimize') {
    const optTitle = out.optimizedTitle as string | undefined;
    const optBullets = (out.optimizedBulletPoints as string[]) ?? [];
    const optDesc = out.optimizedLongDescription as string | undefined;
    const seoKw = (out.seoKeywords as string[]) ?? [];
    const compAnalysis = out.competitorAnalysis as string | undefined;
    return (
      <div className="space-y-4">
        {optTitle && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">优化标题</h4>
            <p className="text-sm font-medium text-gray-900">{optTitle}</p>
          </div>
        )}
        {optBullets.length > 0 && <BulletList items={optBullets} title="优化五点描述" />}
        {optDesc && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">优化长描述</h4>
            <p className="text-xs text-gray-800 whitespace-pre-wrap break-all">{optDesc}</p>
          </div>
        )}
        {seoKw.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              SEO 关键词 ({seoKw.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {seoKw.map((kw, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">{kw}</span>
              ))}
            </div>
          </div>
        )}
        {compAnalysis && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">竞品分析</h4>
            <p className="text-xs text-gray-800 whitespace-pre-wrap">{compAnalysis}</p>
          </div>
        )}
        {record.config_data && <ConfigInfo config={record.config_data} />}
      </div>
    );
  }

  // ── AI 视觉识别 ──
  if (nodeId === 'ai-vision') {
    const results = out.results as string[] | undefined;
    const firstResult = out.firstResult as string | undefined;
    const imageCount = out.imageCount as number | undefined;
    const runId = out.runId as string | undefined;
    return (
      <div className="space-y-4">
        {runId && (
          <div className="text-xs text-gray-400">Run ID: {runId}</div>
        )}
        {imageCount != null && (
          <div className="text-xs text-gray-500">处理图片: {imageCount} 张</div>
        )}
        {results && results.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              识别结果 ({results.length})
            </h4>
            <div className="space-y-1">
              {results.map((r, i) => (
                <div key={i} className="text-xs text-gray-800 bg-gray-50 px-3 py-2 rounded border border-gray-100">
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}
        {firstResult && !results && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">识别结果</h4>
            <p className="text-xs text-gray-800">{firstResult}</p>
          </div>
        )}
        {record.config_data && <ConfigInfo config={record.config_data} />}
      </div>
    );
  }

  // ── 提取商品信息 / 其他: 通用渲染 ──
  return (
    <div className="space-y-4">
      <GenericDataSection title="输出数据" data={out} />
      {record.input_data && Object.keys(record.input_data).length > 0 && (
        <GenericDataSection title="输入数据" data={record.input_data} />
      )}
      {record.config_data && <ConfigInfo config={record.config_data} />}
    </div>
  );
}
